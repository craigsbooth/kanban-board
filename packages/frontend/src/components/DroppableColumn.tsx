import React from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { Plus } from 'lucide-react'
import { Column, Card as CardType } from '@/types'
import { Button } from '@/components/ui/Button'
import { DraggableCard } from './DraggableCard'

interface DroppableColumnProps {
  column: Column
  cards: CardType[]
  onAddCard?: () => void
  onCardClick?: (card: CardType) => void
}

export const DroppableColumn = React.memo(function DroppableColumn({ 
  column, 
  cards, 
  onAddCard, 
  onCardClick 
}: DroppableColumnProps) {
  // Memoize sorted cards to prevent unnecessary re-sorts
  const sortedCards = React.useMemo(() => 
    cards.sort((a, b) => a.position - b.position),
    [cards]
  )

  return (
    <div className="flex-shrink-0 w-80 bg-muted/50 rounded-lg p-4 select-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-foreground">{column.name}</h3>
        <Button variant="ghost" size="sm" onClick={onAddCard}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <Droppable droppableId={column.id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-3 min-h-[100px] transition-colors ${
              snapshot.isDraggingOver ? 'bg-muted/75 rounded-md p-2' : ''
            }`}
          >
            {sortedCards.map((card, index) => (
              <DraggableCard
                key={card.id}
                card={card}
                index={index}
                onClick={() => onCardClick?.(card)}
              />
            ))}
            {provided.placeholder}
            
            {/* Add card button */}
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:bg-muted/50"
              size="sm"
              onClick={onAddCard}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add a card
            </Button>
          </div>
        )}
      </Droppable>
    </div>
  )
})