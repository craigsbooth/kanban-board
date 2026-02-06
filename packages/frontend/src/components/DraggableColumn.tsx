import React from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { Column, Card as CardType } from '@/types'
import { DroppableColumn } from './DroppableColumn'

interface DraggableColumnProps {
  column: Column
  cards: CardType[]
  index: number
  onAddCard?: () => void
  onCardClick?: (card: CardType) => void
}

export const DraggableColumn = React.memo(function DraggableColumn({ 
  column, 
  cards, 
  index, 
  onAddCard, 
  onCardClick 
}: DraggableColumnProps) {
  return (
    <Draggable draggableId={column.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`${
            snapshot.isDragging 
              ? 'rotate-2 shadow-2xl opacity-90' 
              : ''
          } transition-all duration-200`}
        >
          {/* Drag handle - the column header */}
          <div
            {...provided.dragHandleProps}
            className={`cursor-grab active:cursor-grabbing ${
              snapshot.isDragging ? 'cursor-grabbing' : ''
            }`}
          >
            <DroppableColumn
              column={column}
              cards={cards}
              onAddCard={onAddCard}
              onCardClick={onCardClick}
            />
          </div>
        </div>
      )}
    </Draggable>
  )
})