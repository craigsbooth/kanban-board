import { Draggable } from '@hello-pangea/dnd'
import { Card as CardType } from '@/types'

interface DraggableCardProps {
  card: CardType
  index: number
  onClick?: () => void
}

export function DraggableCard({ card, index, onClick }: DraggableCardProps) {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-card p-3 rounded-md shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${
            snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
          }`}
          onClick={onClick}
        >
          <h4 className="font-medium mb-2">{card.title}</h4>
          {card.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {card.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {card._count?.attachments ? `${card._count.attachments} files` : ''}
              {card._count?.comments ? ` • ${card._count.comments} comments` : ''}
            </span>
            
            {card.assignees.length > 0 && (
              <div className="flex -space-x-1">
                {card.assignees.slice(0, 2).map((assignee) => (
                  <div
                    key={assignee.id}
                    className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center border border-background"
                    title={assignee.username}
                  >
                    {assignee.username.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}