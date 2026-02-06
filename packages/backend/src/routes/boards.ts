import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { 
  DEFAULT_AGILE_CONFIG, 
  BoardTemplate,
  AgileConfig 
} from '../types/agile';
import { TemplateService } from '../services/templateService';
import { FeatureService } from '../services/featureService';

const router = Router();

// GET /api/boards/templates - Get available board templates (public endpoint)
router.get('/templates', async (req, res, next) => {
  try {
    const templates = TemplateService.getAvailableTemplates();
    res.json({ templates });
  } catch (error) {
    next(error);
  }
});

// GET /api/boards/templates/recommendations - Get template recommendations (public endpoint)
router.get('/templates/recommendations', async (req, res, next) => {
  try {
    const { teamSize, projectType, methodology } = req.query;
    
    const criteria = {
      teamSize: teamSize ? parseInt(teamSize as string) : undefined,
      projectType: projectType as 'personal' | 'team' | 'enterprise' | undefined,
      methodology: methodology as 'agile' | 'waterfall' | 'kanban' | undefined,
    };
    
    const recommendations = TemplateService.getTemplateRecommendations(criteria);
    res.json({ recommendations });
  } catch (error) {
    next(error);
  }
});

// All other board routes require authentication
router.use(authenticateToken);

// Validation schemas
const createBoardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  templateType: z.enum(['basic', 'kanban', 'scrum']).default('basic'),
  agileConfig: z.object({
    features: z.object({
      sprints: z.boolean().optional(),
      storyPoints: z.boolean().optional(),
      epics: z.boolean().optional(),
      timeTracking: z.boolean().optional(),
      burndownCharts: z.boolean().optional(),
      customWorkflows: z.boolean().optional(),
      labels: z.boolean().optional(),
      priorities: z.boolean().optional(),
    }).optional(),
    storyPointsScale: z.array(z.number()).optional(),
    defaultIssueType: z.enum(['story', 'bug', 'task', 'epic']).optional(),
    requireEstimation: z.boolean().optional(),
    sprintDuration: z.number().min(1).max(30).optional(),
    workingDaysPerWeek: z.number().min(1).max(7).optional(),
  }).optional(),
});

const updateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  templateType: z.enum(['basic', 'kanban', 'scrum']).optional(),
  agileConfig: z.object({
    features: z.object({
      sprints: z.boolean().optional(),
      storyPoints: z.boolean().optional(),
      epics: z.boolean().optional(),
      timeTracking: z.boolean().optional(),
      burndownCharts: z.boolean().optional(),
      customWorkflows: z.boolean().optional(),
      labels: z.boolean().optional(),
      priorities: z.boolean().optional(),
    }).optional(),
    storyPointsScale: z.array(z.number()).optional(),
    defaultIssueType: z.enum(['story', 'bug', 'task', 'epic']).optional(),
    requireEstimation: z.boolean().optional(),
    sprintDuration: z.number().min(1).max(30).optional(),
    workingDaysPerWeek: z.number().min(1).max(7).optional(),
  }).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(1).optional(),
  role: z.enum(['VIEW', 'EDIT', 'ADMIN']).default('EDIT'),
}).refine(data => data.email || data.username, {
  message: "Either email or username must be provided"
});

const updateMemberSchema = z.object({
  role: z.enum(['VIEW', 'EDIT', 'ADMIN']),
});

// GET /api/boards - Get all boards for the authenticated user
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const boards = await prisma.board.findMany({
      where: {
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
      include: {
        owner: {
          select: { id: true, username: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
        },
        columns: {
          orderBy: { position: 'asc' },
        },
        swimLanes: {
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { cards: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ boards });
  } catch (error) {
    next(error);
  }
});

// POST /api/boards - Create a new board
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name, description, templateType, agileConfig } = createBoardSchema.parse(req.body);
    const userId = req.user!.id;

    // Validate template type
    if (!TemplateService.validateTemplate(templateType)) {
      throw createError('Invalid template type', 400);
    }

    // Validate agile config if provided
    if (agileConfig) {
      TemplateService.validateAgileConfig(agileConfig as Partial<AgileConfig>);
    }

    // Generate final agile configuration using template service
    const finalAgileConfig = TemplateService.generateAgileConfig(templateType, agileConfig as Partial<AgileConfig>);

    // Get template configuration
    const template = TemplateService.getTemplate(templateType);
    
    console.log('Creating board with template:', templateType);
    console.log('Template columns:', template.defaultColumns);

    const board = await prisma.board.create({
      data: {
        name,
        description,
        ownerId: userId,
        templateType,
        agileConfig: finalAgileConfig as any,
        columns: {
          create: template.defaultColumns.map(col => ({
            name: col.name,
            position: col.position,
            color: col.color,
          })),
        },
      },
      include: {
        owner: {
          select: { id: true, username: true, email: true },
        },
        columns: {
          orderBy: { position: 'asc' },
        },
        swimLanes: {
          orderBy: { position: 'asc' },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: 'Board created successfully',
      board,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/boards/:id/features - Get feature visibility for a board
router.get('/:id/features', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const board = await prisma.board.findFirst({
      where: {
        id,
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
      select: {
        id: true,
        agileConfig: true,
      },
    });

    if (!board) {
      throw createError('Board not found', 404);
    }

    const agileConfig = board.agileConfig as AgileConfig | null;
    const visibility = FeatureService.getUIVisibility(agileConfig);
    const operations = FeatureService.getAllowedOperations(agileConfig);

    res.json({
      boardId: id,
      visibility,
      operations,
      config: agileConfig,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/boards/:id - Get a specific board
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const board = await prisma.board.findFirst({
      where: {
        id,
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
      include: {
        owner: {
          select: { id: true, username: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
        },
        columns: {
          orderBy: { position: 'asc' },
        },
        swimLanes: {
          orderBy: { position: 'asc' },
        },
        cards: {
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
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!board) {
      throw createError('Board not found', 404);
    }

    res.json({ board });
  } catch (error) {
    next(error);
  }
});

// PUT /api/boards/:id - Update a board
router.put('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const updateData = updateBoardSchema.parse(req.body);

    // Check if user owns the board or has admin access
    const board = await prisma.board.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId: userId,
                role: { in: ['ADMIN'] },
              },
            },
          },
        ],
      },
    });

    if (!board) {
      throw createError('Board not found or insufficient permissions', 404);
    }

    // Validate template type if being updated
    if (updateData.templateType && !TemplateService.validateTemplate(updateData.templateType)) {
      throw createError('Invalid template type', 400);
    }

    // Validate agile config if being updated
    if (updateData.agileConfig) {
      TemplateService.validateAgileConfig(updateData.agileConfig as Partial<AgileConfig>);
    }

    // If agileConfig is being updated, merge with existing config using template service
    let finalUpdateData: any = { ...updateData };
    if (updateData.agileConfig) {
      const currentConfig = (board.agileConfig as any as AgileConfig) || DEFAULT_AGILE_CONFIG;
      finalUpdateData.agileConfig = TemplateService.mergeAgileConfigs(currentConfig, updateData.agileConfig as Partial<AgileConfig>);
    }

    const updatedBoard = await prisma.board.update({
      where: { id },
      data: finalUpdateData,
      include: {
        owner: {
          select: { id: true, username: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
        },
        columns: {
          orderBy: { position: 'asc' },
        },
        swimLanes: {
          orderBy: { position: 'asc' },
        },
      },
    });

    res.json({
      message: 'Board updated successfully',
      board: updatedBoard,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/boards/:id/upgrade-template - Upgrade board to new template
router.post('/:id/upgrade-template', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { targetTemplate, preserveData = true } = z.object({
      targetTemplate: z.enum(['basic', 'kanban', 'scrum']),
      preserveData: z.boolean().default(true),
    }).parse(req.body);

    // Check if user owns the board or has admin access
    const board = await prisma.board.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId: userId,
                role: { in: ['ADMIN'] },
              },
            },
          },
        ],
      },
      include: {
        columns: true,
      },
    });

    if (!board) {
      throw createError('Board not found or insufficient permissions', 404);
    }

    const currentTemplate = (board as any).templateType as BoardTemplate;
    
    // Generate upgrade configuration
    const upgradeConfig = TemplateService.generateUpgradeConfig(
      currentTemplate,
      targetTemplate,
      preserveData
    );

    // Return upgrade preview without applying changes
    res.json({
      message: 'Template upgrade configuration generated',
      currentTemplate,
      targetTemplate,
      upgradeConfig,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/boards/:id/apply-template-upgrade - Apply template upgrade
router.put('/:id/apply-template-upgrade', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { targetTemplate, preserveData = true } = z.object({
      targetTemplate: z.enum(['basic', 'kanban', 'scrum']),
      preserveData: z.boolean().default(true),
    }).parse(req.body);

    // Check if user owns the board or has admin access
    const board = await prisma.board.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId: userId,
                role: { in: ['ADMIN'] },
              },
            },
          },
        ],
      },
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!board) {
      throw createError('Board not found or insufficient permissions', 404);
    }

    const currentTemplate = (board as any).templateType as BoardTemplate;
    
    // Generate upgrade configuration
    const upgradeConfig = TemplateService.generateUpgradeConfig(
      currentTemplate,
      targetTemplate,
      preserveData
    );

    // Apply the upgrade in a transaction
    const updatedBoard = await prisma.$transaction(async (tx) => {
      // Update board template and agile config
      const updated = await tx.board.update({
        where: { id },
        data: {
          templateType: targetTemplate,
          agileConfig: upgradeConfig.newAgileConfig as any,
        },
      });

      // Add new columns
      if (upgradeConfig.columnsToAdd.length > 0) {
        const maxPosition = Math.max(...board.columns.map(c => c.position), -1);
        
        for (let i = 0; i < upgradeConfig.columnsToAdd.length; i++) {
          const columnToAdd = upgradeConfig.columnsToAdd[i];
          await tx.column.create({
            data: {
              boardId: id,
              name: columnToAdd.name,
              position: maxPosition + i + 1,
              color: columnToAdd.color,
            },
          });
        }
      }

      // Remove columns if not preserving data
      if (!preserveData && upgradeConfig.columnsToRemove.length > 0) {
        await tx.column.deleteMany({
          where: {
            boardId: id,
            name: { in: upgradeConfig.columnsToRemove },
          },
        });
      }

      return updated;
    });

    // Fetch the complete updated board
    const completeBoard = await prisma.board.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, username: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
        },
        columns: {
          orderBy: { position: 'asc' },
        },
        swimLanes: {
          orderBy: { position: 'asc' },
        },
      },
    });

    res.json({
      message: 'Board template upgraded successfully',
      board: completeBoard,
      appliedChanges: {
        columnsAdded: upgradeConfig.columnsToAdd.length,
        columnsRemoved: preserveData ? 0 : upgradeConfig.columnsToRemove.length,
        warnings: upgradeConfig.warnings,
      },
    });
  } catch (error) {
    next(error);
  }
});
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Only board owner can delete the board
    const board = await prisma.board.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!board) {
      throw createError('Board not found or insufficient permissions', 404);
    }

    await prisma.board.delete({
      where: { id },
    });

    res.json({
      message: 'Board deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/boards/:id/invite - Generate invitation link
router.post('/:id/invite', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if user owns the board or has admin access
    const board = await prisma.board.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId: userId,
                role: { in: ['ADMIN'] },
              },
            },
          },
        ],
      },
    });

    if (!board) {
      throw createError('Board not found or insufficient permissions', 404);
    }

    // Generate new invite token if needed
    let inviteToken = board.inviteToken;
    if (!inviteToken) {
      inviteToken = require('crypto').randomBytes(32).toString('hex');
      await prisma.board.update({
        where: { id },
        data: { inviteToken },
      });
    }

    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${inviteToken}`;

    res.json({
      message: 'Invitation link generated',
      inviteLink,
      inviteToken,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/boards/join/:token - Join board via invitation
router.post('/join/:token', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.user!.id;

    const board = await prisma.board.findFirst({
      where: { inviteToken: token },
      include: {
        members: true,
        owner: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    if (!board) {
      throw createError('Invalid invitation link', 404);
    }

    // Check if user is already a member or owner
    if (board.ownerId === userId || board.members.some(m => m.userId === userId)) {
      throw createError('You are already a member of this board', 400);
    }

    // Add user as member with EDIT role by default
    await prisma.boardMember.create({
      data: {
        boardId: board.id,
        userId,
        role: 'EDIT',
      },
    });

    // Get updated board with new member
    const updatedBoard = await prisma.board.findUnique({
      where: { id: board.id },
      include: {
        owner: {
          select: { id: true, username: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
        },
        columns: {
          orderBy: { position: 'asc' },
        },
        swimLanes: {
          orderBy: { position: 'asc' },
        },
      },
    });

    res.json({
      message: 'Successfully joined the board',
      board: updatedBoard,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/boards/:id/members - Get board members
router.get('/:id/members', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if user has access to the board
    const board = await prisma.board.findFirst({
      where: {
        id,
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
      throw createError('Board not found or insufficient permissions', 404);
    }

    const members = await prisma.boardMember.findMany({
      where: { boardId: id },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    // Include owner as a member
    const owner = await prisma.user.findUnique({
      where: { id: board.ownerId },
      select: { id: true, username: true, email: true },
    });

    const allMembers = [
      {
        id: `owner-${board.ownerId}`,
        boardId: id,
        userId: board.ownerId,
        role: 'OWNER',
        joinedAt: board.createdAt,
        user: owner,
      },
      ...members,
    ];

    res.json({ members: allMembers });
  } catch (error) {
    next(error);
  }
});

// PUT /api/boards/:id/members/:userId - Update member role
router.put('/:id/members/:userId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const userId = req.user!.id;
    const { role } = updateMemberSchema.parse(req.body);

    // Check if user owns the board or has admin access
    const board = await prisma.board.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId: userId,
                role: { in: ['ADMIN'] },
              },
            },
          },
        ],
      },
    });

    if (!board) {
      throw createError('Board not found or insufficient permissions', 404);
    }

    // Cannot change owner role
    if (board.ownerId === targetUserId) {
      throw createError('Cannot change owner role', 400);
    }

    // Update member role
    const updatedMember = await prisma.boardMember.update({
      where: {
        boardId_userId: {
          boardId: id,
          userId: targetUserId,
        },
      },
      data: { role },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    res.json({
      message: 'Member role updated successfully',
      member: updatedMember,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/boards/:id/members/:userId - Remove member from board
router.delete('/:id/members/:userId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const userId = req.user!.id;

    // Check if user owns the board or has admin access, or is removing themselves
    const board = await prisma.board.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId: userId,
                role: { in: ['ADMIN'] },
              },
            },
          },
        ],
      },
    });

    const isSelfRemoval = userId === targetUserId;

    if (!board && !isSelfRemoval) {
      throw createError('Board not found or insufficient permissions', 404);
    }

    // Cannot remove owner
    if (board && board.ownerId === targetUserId) {
      throw createError('Cannot remove board owner', 400);
    }

    // Remove member
    await prisma.boardMember.delete({
      where: {
        boardId_userId: {
          boardId: id,
          userId: targetUserId,
        },
      },
    });

    res.json({
      message: 'Member removed successfully',
    });
  } catch (error) {
    next(error);
  }
});

export { router as boardRoutes };