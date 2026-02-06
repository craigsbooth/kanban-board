import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const setupSocketIO = (io: Server) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error('Authentication error: JWT secret not configured'));
      }

      const decoded = jwt.verify(token, jwtSecret) as { userId: string };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, email: true },
      });

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user.id;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected`);

    // Join board room
    socket.on('board:join', async (boardId: string) => {
      try {
        // Verify user has access to the board
        const board = await prisma.board.findFirst({
          where: {
            id: boardId,
            OR: [
              { ownerId: socket.userId },
              {
                members: {
                  some: {
                    userId: socket.userId,
                  },
                },
              },
            ],
          },
        });

        if (!board) {
          socket.emit('error', { message: 'Board not found or access denied' });
          return;
        }

        socket.join(`board:${boardId}`);
        socket.emit('board:joined', { boardId });
        
        // Notify other users in the board
        socket.to(`board:${boardId}`).emit('user:joined', {
          userId: socket.userId,
          boardId,
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join board' });
      }
    });

    // Leave board room
    socket.on('board:leave', (boardId: string) => {
      socket.leave(`board:${boardId}`);
      socket.to(`board:${boardId}`).emit('user:left', {
        userId: socket.userId,
        boardId,
      });
    });

    // Card moved event
    socket.on('card:moved', (data: {
      cardId: string;
      boardId: string;
      columnId: string;
      swimLaneId?: string;
      position: number;
    }) => {
      // Broadcast to all users in the board except sender
      socket.to(`board:${data.boardId}`).emit('card:moved', {
        ...data,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Card updated event
    socket.on('card:updated', (data: {
      cardId: string;
      boardId: string;
      changes: Record<string, any>;
    }) => {
      socket.to(`board:${data.boardId}`).emit('card:updated', {
        ...data,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Card created event
    socket.on('card:created', (data: {
      card: any;
      boardId: string;
    }) => {
      socket.to(`board:${data.boardId}`).emit('card:created', {
        ...data,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Card deleted event
    socket.on('card:deleted', (data: {
      cardId: string;
      boardId: string;
    }) => {
      socket.to(`board:${data.boardId}`).emit('card:deleted', {
        ...data,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Typing indicator
    socket.on('user:typing', (data: {
      boardId: string;
      cardId?: string;
      isTyping: boolean;
    }) => {
      socket.to(`board:${data.boardId}`).emit('user:typing', {
        ...data,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Column reordered event
    socket.on('column:reordered', (data: {
      boardId: string;
      columnIds: string[];
    }) => {
      socket.to(`board:${data.boardId}`).emit('column:reordered', {
        ...data,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
      
      // Notify all rooms this user was in
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room.startsWith('board:')) {
          socket.to(room).emit('user:left', {
            userId: socket.userId,
            boardId: room.replace('board:', ''),
          });
        }
      });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};