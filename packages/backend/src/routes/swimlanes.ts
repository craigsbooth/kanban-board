import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { SwimLaneCategory } from '@prisma/client';

const router = Router();

// All swim lane routes require authentication
router.use(authenticateToken);

// Validation schemas
const createSwimLaneSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.nativeEnum(SwimLaneCategory).default('CUSTOM'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  position: z.number().int().min(0).optional(),
});

const updateSwimLaneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.nativeEnum(SwimLaneCategory).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

const reorderSwimLanesSchema = z.object({
  swimLaneIds: z.array(z.string().cuid()),
});

// Helper function to check board access and permissions
async function checkBoardAccess(boardId: string, userId: string, requireEdit = true) {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId: userId,
              role: requireEdit ? { in: ['OWNER', 'ADMIN', 'EDIT'] } : { in: ['OWNER', 'ADMIN', 'EDIT', 'VIEW'] },
            },
          },
        },
      ],
    },
  });

  if (!board) {
    throw createError('Board not found or insufficient permissions', 404);
  }

  return board;
}

// POST /api/boards/:boardId/swimlanes - Create a new swim lane
router.post('/:boardId/swimlanes', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { boardId } = req.params;
    const { name, category, color, position } = createSwimLaneSchema.parse(req.body);
    const userId = req.user!.id;

    await checkBoardAccess(boardId, userId);

    // If no position specified, add to the end
    let swimLanePosition = position;
    if (swimLanePosition === undefined) {
      const lastSwimLane = await prisma.swimLane.findFirst({
        where: { boardId },
        orderBy: { position: 'desc' },
      });
      swimLanePosition = lastSwimLane ? lastSwimLane.position + 1 : 0;
    } else {
      // Shift existing swim lanes to make room
      await prisma.swimLane.updateMany({
        where: {
          boardId,
          position: { gte: swimLanePosition },
        },
        data: {
          position: { increment: 1 },
        },
      });
    }

    const swimLane = await prisma.swimLane.create({
      data: {
        boardId,
        name,
        category,
        color,
        position: swimLanePosition,
      },
    });

    res.status(201).json({
      message: 'Swim lane created successfully',
      swimLane,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/boards/:boardId/swimlanes/:swimLaneId - Update a swim lane
router.put('/:boardId/swimlanes/:swimLaneId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { boardId, swimLaneId } = req.params;
    const updateData = updateSwimLaneSchema.parse(req.body);
    const userId = req.user!.id;

    await checkBoardAccess(boardId, userId);

    // Verify swim lane belongs to board
    const existingSwimLane = await prisma.swimLane.findFirst({
      where: { id: swimLaneId, boardId },
    });

    if (!existingSwimLane) {
      throw createError('Swim lane not found in this board', 404);
    }

    const swimLane = await prisma.swimLane.update({
      where: { id: swimLaneId },
      data: updateData,
    });

    res.json({
      message: 'Swim lane updated successfully',
      swimLane,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/boards/:boardId/swimlanes/:swimLaneId - Delete a swim lane
router.delete('/:boardId/swimlanes/:swimLaneId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { boardId, swimLaneId } = req.params;
    const userId = req.user!.id;

    await checkBoardAccess(boardId, userId);

    // Verify swim lane belongs to board
    const swimLane = await prisma.swimLane.findFirst({
      where: { id: swimLaneId, boardId },
      include: { _count: { select: { cards: true } } },
    });

    if (!swimLane) {
      throw createError('Swim lane not found in this board', 404);
    }

    // Check if swim lane has cards
    if (swimLane._count.cards > 0) {
      throw createError('Cannot delete swim lane with cards. Move cards out of this swim lane first.', 400);
    }

    await prisma.swimLane.delete({
      where: { id: swimLaneId },
    });

    // Reorder remaining swim lanes to fill the gap
    await prisma.swimLane.updateMany({
      where: {
        boardId,
        position: { gt: swimLane.position },
      },
      data: {
        position: { decrement: 1 },
      },
    });

    res.json({
      message: 'Swim lane deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/boards/:boardId/swimlanes/reorder - Reorder swim lanes
router.put('/:boardId/swimlanes/reorder', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { boardId } = req.params;
    const { swimLaneIds } = reorderSwimLanesSchema.parse(req.body);
    const userId = req.user!.id;

    await checkBoardAccess(boardId, userId);

    // Verify all swim lanes belong to the board
    const existingSwimLanes = await prisma.swimLane.findMany({
      where: { boardId },
      select: { id: true },
    });

    const existingSwimLaneIds = existingSwimLanes.map(sl => sl.id);
    const invalidIds = swimLaneIds.filter(id => !existingSwimLaneIds.includes(id));

    if (invalidIds.length > 0) {
      throw createError(`Invalid swim lane IDs: ${invalidIds.join(', ')}`, 400);
    }

    if (swimLaneIds.length !== existingSwimLaneIds.length) {
      throw createError('All swim lanes must be included in reorder operation', 400);
    }

    // Update positions in a transaction
    await prisma.$transaction(
      swimLaneIds.map((swimLaneId, index) =>
        prisma.swimLane.update({
          where: { id: swimLaneId },
          data: { position: index },
        })
      )
    );

    const updatedSwimLanes = await prisma.swimLane.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
    });

    res.json({
      message: 'Swim lanes reordered successfully',
      swimLanes: updatedSwimLanes,
    });
  } catch (error) {
    next(error);
  }
});

export { router as swimLaneRoutes };