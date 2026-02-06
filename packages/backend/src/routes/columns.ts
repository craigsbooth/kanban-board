import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All column routes require authentication
router.use(authenticateToken);

// Validation schemas
const createColumnSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  position: z.number().int().min(0).optional(),
});

const updateColumnSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

const reorderColumnsSchema = z.object({
  columnIds: z.array(z.string().cuid()),
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

// POST /api/boards/:boardId/columns - Create a new column
router.post('/:boardId/columns', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { boardId } = req.params;
    const { name, color, position } = createColumnSchema.parse(req.body);
    const userId = req.user!.id;

    await checkBoardAccess(boardId, userId);

    // If no position specified, add to the end
    let columnPosition = position;
    if (columnPosition === undefined) {
      const lastColumn = await prisma.column.findFirst({
        where: { boardId },
        orderBy: { position: 'desc' },
      });
      columnPosition = lastColumn ? lastColumn.position + 1 : 0;
    } else {
      // Shift existing columns to make room
      await prisma.column.updateMany({
        where: {
          boardId,
          position: { gte: columnPosition },
        },
        data: {
          position: { increment: 1 },
        },
      });
    }

    const column = await prisma.column.create({
      data: {
        boardId,
        name,
        color,
        position: columnPosition,
      },
    });

    res.status(201).json({
      message: 'Column created successfully',
      column,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/boards/:boardId/columns/reorder - Reorder columns (MUST come before /:columnId route)
router.put('/:boardId/columns/reorder', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { boardId } = req.params;
    const { columnIds } = reorderColumnsSchema.parse(req.body);
    const userId = req.user!.id;

    await checkBoardAccess(boardId, userId);

    // Verify all columns belong to the board
    const existingColumns = await prisma.column.findMany({
      where: { boardId },
      select: { id: true },
    });

    const existingColumnIds = existingColumns.map(col => col.id);
    const invalidIds = columnIds.filter(id => !existingColumnIds.includes(id));

    if (invalidIds.length > 0) {
      throw createError(`Invalid column IDs: ${invalidIds.join(', ')}`, 400);
    }

    if (columnIds.length !== existingColumnIds.length) {
      throw createError('All columns must be included in reorder operation', 400);
    }

    // Simple approach: Delete and recreate with new positions
    await prisma.$transaction(async (tx) => {
      // Get all column data first
      const columnsData = await tx.column.findMany({
        where: { 
          id: { in: columnIds },
          boardId 
        },
        select: {
          id: true,
          name: true,
          color: true,
          boardId: true
        }
      });
      
      // Create a map for quick lookup
      const columnMap = new Map(columnsData.map(col => [col.id, col]));
      
      // Delete all columns being reordered
      await tx.column.deleteMany({
        where: {
          id: { in: columnIds },
          boardId
        }
      });
      
      // Recreate them with new positions
      for (let i = 0; i < columnIds.length; i++) {
        const columnData = columnMap.get(columnIds[i]);
        if (columnData) {
          await tx.column.create({
            data: {
              id: columnData.id,
              boardId: columnData.boardId,
              name: columnData.name,
              color: columnData.color,
              position: i
            }
          });
        }
      }
    });

    const updatedColumns = await prisma.column.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
    });

    res.json({
      message: 'Columns reordered successfully',
      columns: updatedColumns,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/boards/:boardId/columns/:columnId - Update a column
router.put('/:boardId/columns/:columnId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { boardId, columnId } = req.params;
    const updateData = updateColumnSchema.parse(req.body);
    const userId = req.user!.id;

    await checkBoardAccess(boardId, userId);

    // Verify column belongs to board
    const existingColumn = await prisma.column.findFirst({
      where: { id: columnId, boardId },
    });

    if (!existingColumn) {
      throw createError('Column not found in this board', 404);
    }

    const column = await prisma.column.update({
      where: { id: columnId },
      data: updateData,
    });

    res.json({
      message: 'Column updated successfully',
      column,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/boards/:boardId/columns/:columnId - Delete a column
router.delete('/:boardId/columns/:columnId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { boardId, columnId } = req.params;
    const userId = req.user!.id;

    await checkBoardAccess(boardId, userId);

    // Verify column belongs to board
    const column = await prisma.column.findFirst({
      where: { id: columnId, boardId },
      include: { _count: { select: { cards: true } } },
    });

    if (!column) {
      throw createError('Column not found in this board', 404);
    }

    // Check if column has cards
    if (column._count.cards > 0) {
      throw createError('Cannot delete column with cards. Move cards to another column first.', 400);
    }

    await prisma.column.delete({
      where: { id: columnId },
    });

    // Reorder remaining columns to fill the gap
    await prisma.column.updateMany({
      where: {
        boardId,
        position: { gt: column.position },
      },
      data: {
        position: { decrement: 1 },
      },
    });

    res.json({
      message: 'Column deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export { router as columnRoutes };