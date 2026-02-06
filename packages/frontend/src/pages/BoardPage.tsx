import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Settings, Users, Plus } from 'lucide-react'
import { DragDropContext, DropResult, Droppable } from '@hello-pangea/dnd'
import { useBoardStore } from '@/store/boardStore'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Ten10Logo } from '@/components/ui/Ten10Logo'
import { DraggableColumn } from '@/components/DraggableColumn'
import { CardDetailModal } from '@/components/CardDetailModal'
import { CreateCardModal } from '@/components/CreateCardModal'
import { BoardMembersModal } from '@/components/BoardMembersModal'
import { Card as CardType } from '@/types'

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const { currentBoard, isLoading, fetchBoard, clearCurrentBoard, moveCard, reorderColumns } = useBoardStore()
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null)
  const [createCardModal, setCreateCardModal] = useState<{ isOpen: boolean; columnId: string }>({
    isOpen: false,
    columnId: ''
  })
  const [membersModalOpen, setMembersModalOpen] = useState(false)

  useEffect(() => {
    if (id) {
      fetchBoard(id)
    }

    return () => {
      clearCurrentBoard()
    }
  }, [id, fetchBoard, clearCurrentBoard])

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId, type } = result

    // If dropped outside a droppable area
    if (!destination) {
      return
    }

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    try {
      if (type === 'COLUMN') {
        // Handle column reordering
        const columnIds = currentBoard?.columns
          ?.sort((a, b) => a.position - b.position)
          ?.map(col => col.id) || []
        
        // Remove the dragged column and insert it at the new position
        const [movedColumnId] = columnIds.splice(source.index, 1)
        columnIds.splice(destination.index, 0, movedColumnId)
        
        await reorderColumns(columnIds)
      } else {
        // Handle card movement (existing logic)
        // Calculate the new position based on the destination index
        let newPosition = destination.index

        // If moving within the same column, adjust for the card being removed
        if (destination.droppableId === source.droppableId) {
          // When moving within the same column, the position calculation is straightforward
          newPosition = destination.index
        } else {
          // When moving to a different column, use the destination index directly
          newPosition = destination.index
        }

        await moveCard(
          draggableId,
          destination.droppableId,
          newPosition
        )
      }
    } catch (error) {
      console.error('Failed to handle drag end:', error)
    }
  }, [currentBoard?.columns, moveCard, reorderColumns])

  const handleCardClick = useCallback((card: CardType) => {
    setSelectedCard(card)
  }, [])

  const handleAddCard = useCallback((columnId: string) => {
    setCreateCardModal({ isOpen: true, columnId })
  }, [])

  const handleCloseCardDetail = useCallback(() => {
    setSelectedCard(null)
  }, [])

  const handleCloseCreateCard = useCallback(() => {
    setCreateCardModal({ isOpen: false, columnId: '' })
  }, [])

  const handleOpenMembersModal = useCallback(() => {
    setMembersModalOpen(true)
  }, [])

  const handleCloseMembersModal = useCallback(() => {
    setMembersModalOpen(false)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!currentBoard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Board not found</h1>
          <p className="text-muted-foreground mb-4">
            The board you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link to="/dashboard">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Ten10Logo size="sm" />
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              
              <div className="border-l pl-4">
                <h1 className="text-2xl font-bold">{currentBoard.name}</h1>
                {currentBoard.description && (
                  <p className="text-muted-foreground">
                    {currentBoard.description}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenMembersModal}>
                <Users className="h-4 w-4 mr-2" />
                Members ({currentBoard.members.length + 1})
              </Button>
              <Link to={`/board/${currentBoard.id}/settings`}>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Board Content */}
      <main className="container mx-auto px-4 py-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Droppable area for columns */}
          <Droppable droppableId="board" direction="horizontal" type="COLUMN">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex gap-6 overflow-x-auto pb-4 ${
                  snapshot.isDraggingOver ? 'bg-muted/25 rounded-lg p-2' : ''
                }`}
              >
                {/* Columns */}
                {currentBoard.columns
                  .sort((a, b) => a.position - b.position)
                  .map((column, index) => {
                    const columnCards = currentBoard.cards?.filter(card => card.columnId === column.id) || []
                    
                    return (
                      <DraggableColumn
                        key={column.id}
                        column={column}
                        cards={columnCards}
                        index={index}
                        onAddCard={() => handleAddCard(column.id)}
                        onCardClick={handleCardClick}
                      />
                    )
                  })}
                
                {provided.placeholder}
                
                {/* Add column button */}
                <div className="flex-shrink-0 w-80">
                  <Button
                    variant="ghost"
                    className="w-full h-12 border-2 border-dashed border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add another list
                  </Button>
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </main>

      {/* Powered by Ten10 Badge */}
      <div className="fixed bottom-4 right-4">
        <div className="bg-card border rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Powered by</span>
            <Ten10Logo size="sm" />
          </div>
        </div>
      </div>

      {/* Modals */}
      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={handleCloseCardDetail}
      />
      
      <CreateCardModal
        isOpen={createCardModal.isOpen}
        onClose={handleCloseCreateCard}
        columnId={createCardModal.columnId}
        boardId={currentBoard.id}
      />
      
      <BoardMembersModal
        isOpen={membersModalOpen}
        onClose={handleCloseMembersModal}
        boardId={currentBoard.id}
      />
    </div>
  )
}