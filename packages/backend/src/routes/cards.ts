import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { FeatureService } from '../services/featureService';
import { AgileConfig, FIBONACCI_SEQUENCE, VALID_PRIORITIES, VALID_ISSUE_TYPES } from '../types/agile';

const router = Router();

// All card routes require authentication
router.use(authenticateToken);

// Validation schemas
const createCardSchema = z.object({
  boardId: z.string().cuid(),
  columnId: z.string().cuid(),
  swimLaneId: z.string().cuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  position: z.number().int().min(0).optional(),
  // Agile-specific fields
  storyPoints: z.number().int().positive().optional(),
  priority: z.enum(['highest', 'high', 'medium', 'low', 'lowest']).optional(),
  issueType: z.enum(['story', 'bug', 'task', 'epic']).optional(),
  originalEstimate: z.number().int().positive().optional(), // hours
});

const updateCardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  columnId: z.string().cuid().optional(),
  swimLaneId: z.string().cuid().optional(),
  position: z.number().int().min(0).optional(),
  dueDate: z.string().datetime().optional(),
  // Agile-specific fields
  storyPoints: z.number().int().positive().optional(),
  priority: z.enum(['highest', 'high', 'medium', 'low', 'lowest']).optional(),
  issueType: z.enum(['story', 'bug', 'task', 'epic']).optional(),
  originalEstimate: z.number().int().positive().optional(), // hours
  remainingEstimate: z.number().int().min(0).optional(), // hours
});

// Helper function to check board access and get agile config
const checkBoardAccess = async (boardId: string, userId: string) => {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      ],
    },
  });

  if (!board) {
    throw createError('Board not found or access denied', 404);
  }

  return board;
};

// Helper function to validate agile features for card operations
const validateCardAgileFeatures = (
  agileConfig: AgileConfig | null,
  cardData: {
    storyPoints?: number;
    priority?: string;
    issueType?: string;
    originalEstimate?: number;
    remainingEstimate?: number;
  }
) => {
  // Validate story points
  if (cardData.storyPoints !== undefined) {
    FeatureService.requireFeature(agileConfig, 'storyPoints', 'Story points assignment');
    FeatureService.validateStoryPoints(agileConfig, cardData.storyPoints);
  }

  // Validate priority
  if (cardData.priority !== undefined) {
    FeatureService.requireFeature(agileConfig, 'priorities', 'Priority assignment');
  }

  // Validate time tracking fields
  if (cardData.originalEstimate !== undefined || cardData.remainingEstimate !== undefined) {
    FeatureService.requireFeature(agileConfig, 'timeTracking', 'Time estimation');
  }
};

// GET /api/cards/:id - Get a specific card
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        board: true,
        column: true,
        swimLane: true,
        creator: {
          select: { id: true, username: true, email: true },
        },
        assignees: {
          select: { id: true, username: true, email: true },
        },
        labels: true,
        attachments: true,
        customFields: true,
        checklists: {
          include: {
            items: {
              orderBy: { position: 'asc' },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        subscriptions: {
          where: { userId },
        },
      },
    });

    if (!card) {
      throw createError('Card not found', 404);
    }

    // Check if user has access to the board
    await checkBoardAccess(card.boardId, userId);

    res.json({ card });
  } catch (error) {
    next(error);
  }
});

// POST /api/cards - Create a new card
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { 
      boardId, 
      columnId, 
      swimLaneId, 
      title, 
      description, 
      position,
      storyPoints,
      priority,
      issueType,
      originalEstimate
    } = createCardSchema.parse(req.body);
    const userId = req.user!.id;

    // Check board access and get agile config
    const board = await checkBoardAccess(boardId, userId);
    const agileConfig = board.agileConfig as AgileConfig | null;

    // Validate agile features
    validateCardAgileFeatures(agileConfig, {
      storyPoints,
      priority,
      issueType,
      originalEstimate,
    });

    // Verify column belongs to board
    const column = await prisma.column.findFirst({
      where: { id: columnId, boardId },
    });

    if (!column) {
      throw createError('Column not found in this board', 404);
    }

    // Verify swim lane belongs to board (if provided)
    if (swimLaneId) {
      const swimLane = await prisma.swimLane.findFirst({
        where: { id: swimLaneId, boardId },
      });

      if (!swimLane) {
        throw createError('Swim lane not found in this board', 404);
      }
    }

    // Calculate position if not provided
    let cardPosition = position;
    if (cardPosition === undefined) {
      const lastCard = await prisma.card.findFirst({
        where: { columnId },
        orderBy: { position: 'desc' },
      });
      cardPosition = (lastCard?.position ?? -1) + 1;
    }

    // Set default values based on agile config
    const defaultIssueType = agileConfig?.defaultIssueType || 'task';

    const card = await prisma.card.create({
      data: {
        boardId,
        columnId,
        swimLaneId,
        title,
        description,
        position: cardPosition,
        createdBy: userId,
        // Agile fields
        storyPoints,
        priority: priority || 'medium',
        issueType: issueType || defaultIssueType,
        originalEstimate,
      },
      include: {
        creator: {
          select: { id: true, username: true, email: true },
        },
        assignees: {
          select: { id: true, username: true, email: true },
        },
        labels: true,
        _count: {
          select: { 
            attachments: true,
            comments: true,
            checklists: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Card created successfully',
      card,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/cards/:id - Update a card
router.put('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const updateData = updateCardSchema.parse(req.body);

    const card = await prisma.card.findUnique({
      where: { id },
      include: { board: true },
    });

    if (!card) {
      throw createError('Card not found', 404);
    }

    // Check board access and get agile config
    const board = await checkBoardAccess(card.boardId, userId);
    const agileConfig = board.agileConfig as AgileConfig | null;

    // Validate agile features for update data
    validateCardAgileFeatures(agileConfig, {
      storyPoints: updateData.storyPoints,
      priority: updateData.priority,
      issueType: updateData.issueType,
      originalEstimate: updateData.originalEstimate,
      remainingEstimate: updateData.remainingEstimate,
    });

    // If moving to a different column, verify it belongs to the same board
    if (updateData.columnId && updateData.columnId !== card.columnId) {
      const column = await prisma.column.findFirst({
        where: { id: updateData.columnId, boardId: card.boardId },
      });

      if (!column) {
        throw createError('Column not found in this board', 404);
      }
    }

    // If changing swim lane, verify it belongs to the same board
    if (updateData.swimLaneId) {
      const swimLane = await prisma.swimLane.findFirst({
        where: { id: updateData.swimLaneId, boardId: card.boardId },
      });

      if (!swimLane) {
        throw createError('Swim lane not found in this board', 404);
      }
    }

    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        ...updateData,
        ...(updateData.dueDate && { dueDate: new Date(updateData.dueDate) }),
      },
      include: {
        creator: {
          select: { id: true, username: true, email: true },
        },
        assignees: {
          select: { id: true, username: true, email: true },
        },
        labels: true,
        attachments: true,
        customFields: true,
        checklists: {
          include: {
            items: {
              orderBy: { position: 'asc' },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    res.json({
      message: 'Card updated successfully',
      card: updatedCard,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/cards/:id - Delete a card
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const card = await prisma.card.findUnique({
      where: { id },
      include: { board: true },
    });

    if (!card) {
      throw createError('Card not found', 404);
    }

    // Check board access
    await checkBoardAccess(card.boardId, userId);

    await prisma.card.delete({
      where: { id },
    });

    res.json({
      message: 'Card deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/cards/:id/subscribe - Subscribe to card notifications
router.post('/:id/subscribe', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const card = await prisma.card.findUnique({
      where: { id },
      include: { board: true },
    });

    if (!card) {
      throw createError('Card not found', 404);
    }

    // Check board access
    await checkBoardAccess(card.boardId, userId);

    // Create subscription (upsert to handle duplicates)
    await prisma.cardSubscription.upsert({
      where: {
        cardId_userId: {
          cardId: id,
          userId,
        },
      },
      update: {},
      create: {
        cardId: id,
        userId,
      },
    });

    res.json({
      message: 'Successfully subscribed to card notifications',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/cards/:id/subscribe - Unsubscribe from card notifications
router.delete('/:id/subscribe', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const card = await prisma.card.findUnique({
      where: { id },
      include: { board: true },
    });

    if (!card) {
      throw createError('Card not found', 404);
    }

    // Check board access
    await checkBoardAccess(card.boardId, userId);

    await prisma.cardSubscription.deleteMany({
      where: {
        cardId: id,
        userId,
      },
    });

    res.json({
      message: 'Successfully unsubscribed from card notifications',
    });
  } catch (error) {
    next(error);
  }
});

export { router as cardRoutes };