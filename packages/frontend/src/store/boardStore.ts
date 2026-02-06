import { create } from 'zustand'
import api from '../lib/api'
import socketService from '../lib/socket'
import toast from 'react-hot-toast'
import type { 
  Board, 
  Card, 
  CreateBoardForm, 
  UpdateBoardForm, 
  CreateCardForm, 
  UpdateCardForm,
  BoardMember 
} from '../types'

interface BoardState {
  boards: Board[]
  currentBoard: Board | null
  isLoading: boolean
  
  // Actions
  fetchBoards: () => Promise<void>
  fetchBoard: (id: string) => Promise<void>
  createBoard: (data: CreateBoardForm) => Promise<Board>
  updateBoard: (id: string, data: UpdateBoardForm) => Promise<void>
  deleteBoard: (id: string) => Promise<void>
  
  // Card actions
  createCard: (data: CreateCardForm) => Promise<Card>
  updateCard: (id: string, data: UpdateCardForm) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  moveCard: (cardId: string, columnId: string, position: number, swimLaneId?: string) => Promise<void>
  
  // Column actions
  reorderColumns: (columnIds: string[]) => Promise<void>
  
  // Board sharing actions
  generateInviteLink: (boardId: string) => Promise<{ inviteLink: string; inviteToken: string }>
  joinBoard: (token: string) => Promise<Board>
  fetchBoardMembers: (boardId: string) => Promise<BoardMember[]>
  updateMemberRole: (boardId: string, userId: string, role: string) => Promise<void>
  removeMember: (boardId: string, userId: string) => Promise<void>
  
  // Real-time updates
  handleCardMoved: (data: any) => void
  handleCardUpdated: (data: any) => void
  handleCardCreated: (data: any) => void
  handleCardDeleted: (data: any) => void
  handleColumnReordered: (data: any) => void
  
  // Utility
  clearCurrentBoard: () => void
  
  // Feature visibility
  getFeatureVisibility: () => {
    sprints: boolean
    storyPoints: boolean
    epics: boolean
    timeTracking: boolean
    burndownCharts: boolean
    customWorkflows: boolean
    labels: boolean
    priorities: boolean
  }
  isFeatureEnabled: (feature: string) => boolean
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  currentBoard: null,
  isLoading: false,

  fetchBoards: async () => {
    try {
      set({ isLoading: true })
      
      const response = await api.get('/boards')
      const { boards } = response.data
      
      set({ boards, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  fetchBoard: async (id: string) => {
    try {
      set({ isLoading: true })
      
      const response = await api.get(`/boards/${id}`)
      const { board } = response.data
      
      set({ currentBoard: board, isLoading: false })
      
      // Join board room for real-time updates
      socketService.joinBoard(id)
      
      // Set up real-time event listeners
      const { handleCardMoved, handleCardUpdated, handleCardCreated, handleCardDeleted, handleColumnReordered } = get()
      
      socketService.onCardMoved(handleCardMoved)
      socketService.onCardUpdated(handleCardUpdated)
      socketService.onCardCreated(handleCardCreated)
      socketService.onCardDeleted(handleCardDeleted)
      socketService.onColumnReordered(handleColumnReordered)
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  createBoard: async (data: CreateBoardForm) => {
    try {
      const response = await api.post('/boards', data)
      const { board } = response.data
      
      set(state => ({
        boards: [board, ...state.boards]
      }))
      
      toast.success('Board created successfully!')
      return board
    } catch (error) {
      throw error
    }
  },

  updateBoard: async (id: string, data: UpdateBoardForm) => {
    try {
      const response = await api.put(`/boards/${id}`, data)
      const { board } = response.data
      
      set(state => ({
        boards: state.boards.map(b => b.id === id ? board : b),
        currentBoard: state.currentBoard?.id === id ? board : state.currentBoard
      }))
      
      toast.success('Board updated successfully!')
    } catch (error) {
      throw error
    }
  },

  deleteBoard: async (id: string) => {
    try {
      await api.delete(`/boards/${id}`)
      
      set(state => ({
        boards: state.boards.filter(b => b.id !== id),
        currentBoard: state.currentBoard?.id === id ? null : state.currentBoard
      }))
      
      toast.success('Board deleted successfully!')
    } catch (error) {
      throw error
    }
  },

  createCard: async (data: CreateCardForm) => {
    try {
      const response = await api.post('/cards', data)
      const { card } = response.data
      
      // Update current board if it matches
      set(state => {
        if (state.currentBoard?.id === data.boardId) {
          return {
            currentBoard: {
              ...state.currentBoard,
              cards: [...(state.currentBoard.cards || []), card]
            }
          }
        }
        return state
      })
      
      // Emit socket event
      socketService.emitCardCreated({
        card,
        boardId: data.boardId
      })
      
      toast.success('Card created successfully!')
      return card
    } catch (error) {
      throw error
    }
  },

  updateCard: async (id: string, data: UpdateCardForm) => {
    try {
      const response = await api.put(`/cards/${id}`, data)
      const { card } = response.data
      
      // Update current board
      set(state => {
        if (state.currentBoard?.cards) {
          return {
            currentBoard: {
              ...state.currentBoard,
              cards: state.currentBoard.cards.map(c => c.id === id ? card : c)
            }
          }
        }
        return state
      })
      
      // Emit socket event
      socketService.emitCardUpdated({
        cardId: id,
        boardId: card.boardId,
        changes: data
      })
      
      toast.success('Card updated successfully!')
    } catch (error) {
      throw error
    }
  },

  deleteCard: async (id: string) => {
    try {
      const state = get()
      const card = state.currentBoard?.cards?.find(c => c.id === id)
      
      await api.delete(`/cards/${id}`)
      
      // Update current board
      set(state => {
        if (state.currentBoard?.cards) {
          return {
            currentBoard: {
              ...state.currentBoard,
              cards: state.currentBoard.cards.filter(c => c.id !== id)
            }
          }
        }
        return state
      })
      
      // Emit socket event
      if (card) {
        socketService.emitCardDeleted({
          cardId: id,
          boardId: card.boardId
        })
      }
      
      toast.success('Card deleted successfully!')
    } catch (error) {
      throw error
    }
  },

  moveCard: async (cardId: string, columnId: string, newPosition: number, swimLaneId?: string) => {
    // Store original state for rollback if needed
    const originalState = get()
    const originalCard = originalState.currentBoard?.cards?.find(card => card.id === cardId)
    
    if (!originalCard || !originalState.currentBoard) {
      return
    }

    // OPTIMISTIC UPDATE: Update UI immediately for smooth experience
    set(state => {
      if (state.currentBoard?.cards) {
        const allCards = [...state.currentBoard.cards]
        
        // Remove the moved card from the array
        const movedCardIndex = allCards.findIndex(card => card.id === cardId)
        if (movedCardIndex === -1) return state
        
        const [movedCard] = allCards.splice(movedCardIndex, 1)
        
        // Get cards in the source column (excluding the moved card)
        const sourceColumnCards = allCards
          .filter(card => card.columnId === originalCard.columnId)
          .sort((a, b) => a.position - b.position)
        
        // Get cards in the target column
        const targetColumnCards = allCards
          .filter(card => card.columnId === columnId)
          .sort((a, b) => a.position - b.position)
        
        // Update positions in source column (if card moved to different column)
        if (originalCard.columnId !== columnId) {
          sourceColumnCards.forEach((card, index) => {
            card.position = index
          })
        }
        
        // Insert the moved card at the new position in target column
        const updatedMovedCard = {
          ...movedCard,
          columnId,
          swimLaneId,
          position: newPosition
        }
        
        targetColumnCards.splice(newPosition, 0, updatedMovedCard)
        
        // Update positions in target column
        targetColumnCards.forEach((card, index) => {
          card.position = index
        })
        
        // Rebuild the complete cards array
        const otherColumnCards = allCards.filter(
          card => card.columnId !== originalCard.columnId && card.columnId !== columnId
        )
        
        const finalCards = [
          ...sourceColumnCards,
          ...targetColumnCards,
          ...otherColumnCards
        ]
        
        return {
          currentBoard: {
            ...state.currentBoard,
            cards: finalCards
          }
        }
      }
      return state
    })

    try {
      // API call happens in background
      const updateData: UpdateCardForm = {
        columnId,
        position: newPosition,
        swimLaneId
      }
      
      await api.put(`/cards/${cardId}`, updateData)
      
      // Emit socket event for other users
      socketService.emitCardMoved({
        cardId,
        boardId: originalState.currentBoard.id,
        columnId,
        swimLaneId,
        position: newPosition
      })
      
    } catch (error) {
      // ROLLBACK: If API call fails, revert to original state
      console.error('Failed to move card, rolling back:', error)
      
      set(state => {
        if (state.currentBoard && originalState.currentBoard) {
          return {
            currentBoard: {
              ...state.currentBoard,
              cards: originalState.currentBoard.cards
            }
          }
        }
        return state
      })
      
      // Show error to user
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error('Failed to move card. Please try again.')
      })
      
      throw error
    }
  },

  // Column actions
  reorderColumns: async (columnIds: string[]) => {
    // Store original state for rollback if needed
    const originalState = get()
    
    if (!originalState.currentBoard) {
      return
    }

    // Check if the order is actually changing
    const currentColumnIds = originalState.currentBoard.columns
      .sort((a, b) => a.position - b.position)
      .map(col => col.id)
    
    if (JSON.stringify(currentColumnIds) === JSON.stringify(columnIds)) {
      return // No change needed
    }

    // OPTIMISTIC UPDATE: Update UI immediately for smooth experience
    set(state => {
      if (state.currentBoard?.columns) {
        // Create new columns array with updated positions, preserving object references where possible
        const columnMap = new Map(state.currentBoard.columns.map(col => [col.id, col]))
        
        const reorderedColumns = columnIds.map((columnId, index) => {
          const column = columnMap.get(columnId)
          if (!column) return null
          
          // Only create new object if position actually changed
          if (column.position === index) {
            return column // Keep same reference if position unchanged
          }
          
          return {
            ...column,
            position: index
          }
        }).filter(Boolean) as typeof state.currentBoard.columns
        
        return {
          currentBoard: {
            ...state.currentBoard,
            columns: reorderedColumns
          }
        }
      }
      return state
    })

    try {
      // API call happens in background
      await api.put(`/boards/${originalState.currentBoard.id}/columns/reorder`, {
        columnIds
      })
      
      // Emit socket event for other users (but not for ourselves)
      socketService.emitColumnReordered({
        boardId: originalState.currentBoard.id,
        columnIds
      })
      
      // Don't update state here - our optimistic update is already correct
      // This prevents the janky re-render
      
    } catch (error) {
      // ROLLBACK: If API call fails, revert to original state
      console.error('Failed to reorder columns, rolling back:', error)
      
      set(state => {
        if (state.currentBoard && originalState.currentBoard) {
          return {
            currentBoard: {
              ...state.currentBoard,
              columns: originalState.currentBoard.columns
            }
          }
        }
        return state
      })
      
      // Show error to user
      toast.error('Failed to reorder columns. Please try again.')
      
      throw error
    }
  },

  // Board sharing actions
  generateInviteLink: async (boardId: string) => {
    try {
      const response = await api.post(`/boards/${boardId}/invite`)
      const { inviteLink, inviteToken } = response.data
      
      toast.success('Invitation link generated!')
      return { inviteLink, inviteToken }
    } catch (error) {
      throw error
    }
  },

  joinBoard: async (token: string) => {
    try {
      const response = await api.post(`/boards/join/${token}`)
      const { board } = response.data
      
      // Add to boards list
      set(state => ({
        boards: [board, ...state.boards]
      }))
      
      toast.success('Successfully joined the board!')
      return board
    } catch (error) {
      throw error
    }
  },

  fetchBoardMembers: async (boardId: string) => {
    try {
      const response = await api.get(`/boards/${boardId}/members`)
      const { members } = response.data
      
      return members
    } catch (error) {
      throw error
    }
  },

  updateMemberRole: async (boardId: string, userId: string, role: string) => {
    try {
      await api.put(`/boards/${boardId}/members/${userId}`, { role })
      
      // Update current board if it matches
      set(state => {
        if (state.currentBoard?.id === boardId) {
          const updatedMembers = state.currentBoard.members.map(member => 
            member.userId === userId ? { ...member, role: role as any } : member
          )
          
          return {
            currentBoard: {
              ...state.currentBoard,
              members: updatedMembers
            }
          }
        }
        return state
      })
      
      toast.success('Member role updated successfully!')
    } catch (error) {
      throw error
    }
  },

  removeMember: async (boardId: string, userId: string) => {
    try {
      await api.delete(`/boards/${boardId}/members/${userId}`)
      
      // Update current board if it matches
      set(state => {
        if (state.currentBoard?.id === boardId) {
          const updatedMembers = state.currentBoard.members.filter(member => 
            member.userId !== userId
          )
          
          return {
            currentBoard: {
              ...state.currentBoard,
              members: updatedMembers
            }
          }
        }
        return state
      })
      
      toast.success('Member removed successfully!')
    } catch (error) {
      throw error
    }
  },

  // Real-time event handlers
  handleCardMoved: (data: any) => {
    set(state => {
      if (state.currentBoard?.id === data.boardId && state.currentBoard.cards) {
        const updatedCards = state.currentBoard.cards.map(card => {
          if (card.id === data.cardId) {
            return {
              ...card,
              columnId: data.columnId,
              position: data.position,
              swimLaneId: data.swimLaneId
            }
          }
          return card
        })
        
        return {
          ...state,
          currentBoard: {
            ...state.currentBoard,
            cards: updatedCards
          }
        }
      }
      return state
    })
  },

  handleCardUpdated: (data: any) => {
    set(state => {
      if (state.currentBoard?.id === data.boardId && state.currentBoard.cards) {
        const updatedCards = state.currentBoard.cards.map(card => {
          if (card.id === data.cardId) {
            return {
              ...card,
              ...data.changes
            }
          }
          return card
        })
        
        return {
          ...state,
          currentBoard: {
            ...state.currentBoard,
            cards: updatedCards
          }
        }
      }
      return state
    })
  },

  handleCardCreated: (data: any) => {
    set(state => {
      if (state.currentBoard?.id === data.boardId) {
        return {
          ...state,
          currentBoard: {
            ...state.currentBoard,
            cards: [...(state.currentBoard.cards || []), data.card]
          }
        }
      }
      return state
    })
  },

  handleCardDeleted: (data: any) => {
    set(state => {
      if (state.currentBoard?.id === data.boardId && state.currentBoard.cards) {
        return {
          ...state,
          currentBoard: {
            ...state.currentBoard,
            cards: state.currentBoard.cards.filter(c => c.id !== data.cardId)
          }
        }
      }
      return state
    })
  },

  handleColumnReordered: (data: any) => {
    set(state => {
      if (state.currentBoard?.id === data.boardId && state.currentBoard.columns) {
        // Check if the current order already matches the received order
        const currentColumnIds = state.currentBoard.columns
          .sort((a, b) => a.position - b.position)
          .map(col => col.id)
        
        // If the order is already correct, don't update state to prevent re-render
        if (JSON.stringify(currentColumnIds) === JSON.stringify(data.columnIds)) {
          return state
        }
        
        // Create column map for efficient lookup
        const columnMap = new Map(state.currentBoard.columns.map(col => [col.id, col]))
        
        // Reorder columns based on the received columnIds, preserving object references where possible
        const reorderedColumns = data.columnIds.map((columnId: string, index: number) => {
          const column = columnMap.get(columnId)
          if (!column) return null
          
          // Only create new object if position actually changed
          if (column.position === index) {
            return column // Keep same reference if position unchanged
          }
          
          return {
            ...column,
            position: index
          }
        }).filter(Boolean) as typeof state.currentBoard.columns
        
        return {
          ...state,
          currentBoard: {
            ...state.currentBoard,
            columns: reorderedColumns
          }
        }
      }
      return state
    })
  },

  clearCurrentBoard: () => {
    const state = get()
    if (state.currentBoard) {
      socketService.leaveBoard(state.currentBoard.id)
      
      // Clean up event listeners
      socketService.off('card:moved')
      socketService.off('card:updated')
      socketService.off('card:created')
      socketService.off('card:deleted')
      socketService.off('column:reordered')
    }
    set({ currentBoard: null })
  },

  // Feature visibility methods
  getFeatureVisibility: () => {
    const state = get()
    const agileConfig = state.currentBoard?.agileConfig
    
    if (!agileConfig) {
      return {
        sprints: false,
        storyPoints: false,
        epics: false,
        timeTracking: false,
        burndownCharts: false,
        customWorkflows: false,
        labels: false,
        priorities: false,
      }
    }

    return {
      sprints: agileConfig.features.sprints || false,
      storyPoints: agileConfig.features.storyPoints || false,
      epics: agileConfig.features.epics || false,
      timeTracking: agileConfig.features.timeTracking || false,
      burndownCharts: agileConfig.features.burndownCharts || false,
      customWorkflows: agileConfig.features.customWorkflows || false,
      labels: agileConfig.features.labels || false,
      priorities: agileConfig.features.priorities || false,
    }
  },

  isFeatureEnabled: (feature: string) => {
    const visibility = get().getFeatureVisibility()
    return visibility[feature as keyof typeof visibility] || false
  },
}))