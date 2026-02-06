import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

class SocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(token: string) {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    })

    this.socket.on('connect', () => {
      console.log('Connected to server')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason)
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect(token)
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      this.handleReconnect(token)
    })

    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    return this.socket
  }

  private handleReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
      
      setTimeout(() => {
        this.connect(token)
      }, Math.pow(2, this.reconnectAttempts) * 1000) // Exponential backoff
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket() {
    return this.socket
  }

  isConnected() {
    return this.socket?.connected || false
  }

  // Board-specific methods
  joinBoard(boardId: string) {
    if (this.socket) {
      this.socket.emit('board:join', boardId)
    }
  }

  leaveBoard(boardId: string) {
    if (this.socket) {
      this.socket.emit('board:leave', boardId)
    }
  }

  // Card events
  emitCardMoved(data: {
    cardId: string
    boardId: string
    columnId: string
    swimLaneId?: string
    position: number
  }) {
    if (this.socket) {
      this.socket.emit('card:moved', data)
    }
  }

  emitCardUpdated(data: {
    cardId: string
    boardId: string
    changes: Record<string, any>
  }) {
    if (this.socket) {
      this.socket.emit('card:updated', data)
    }
  }

  emitCardCreated(data: {
    card: any
    boardId: string
  }) {
    if (this.socket) {
      this.socket.emit('card:created', data)
    }
  }

  emitCardDeleted(data: {
    cardId: string
    boardId: string
  }) {
    if (this.socket) {
      this.socket.emit('card:deleted', data)
    }
  }

  // Typing indicators
  emitTyping(data: {
    boardId: string
    cardId?: string
    isTyping: boolean
  }) {
    if (this.socket) {
      this.socket.emit('user:typing', data)
    }
  }

  // Column events
  emitColumnReordered(data: {
    boardId: string
    columnIds: string[]
  }) {
    if (this.socket) {
      this.socket.emit('column:reordered', data)
    }
  }

  // Event listeners
  onBoardJoined(callback: (data: { boardId: string }) => void) {
    if (this.socket) {
      this.socket.on('board:joined', callback)
    }
  }

  onUserJoined(callback: (data: { userId: string; boardId: string }) => void) {
    if (this.socket) {
      this.socket.on('user:joined', callback)
    }
  }

  onUserLeft(callback: (data: { userId: string; boardId: string }) => void) {
    if (this.socket) {
      this.socket.on('user:left', callback)
    }
  }

  onCardMoved(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('card:moved', callback)
    }
  }

  onCardUpdated(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('card:updated', callback)
    }
  }

  onCardCreated(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('card:created', callback)
    }
  }

  onCardDeleted(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('card:deleted', callback)
    }
  }

  onUserTyping(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user:typing', callback)
    }
  }

  onColumnReordered(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('column:reordered', callback)
    }
  }

  // Remove event listeners
  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }
}

export const socketService = new SocketService()
export default socketService