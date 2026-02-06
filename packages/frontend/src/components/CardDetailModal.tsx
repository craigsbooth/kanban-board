import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { 
  Calendar, 
  Paperclip, 
  MessageSquare, 
  User, 
  Tag, 
  CheckSquare,
  Plus,
  Trash2,
  Edit3,
  Save,
  X
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { useBoardStore } from '@/store/boardStore'
import { Card as CardType, UpdateCardForm } from '@/types'
import { format } from 'date-fns'

interface CardDetailModalProps {
  card: CardType | null
  isOpen: boolean
  onClose: () => void
}

export function CardDetailModal({ card, isOpen, onClose }: CardDetailModalProps) {
  const { updateCard, deleteCard, currentBoard } = useBoardStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, reset, watch, setValue } = useForm<UpdateCardForm>({
    defaultValues: {
      title: card?.title || '',
      description: card?.description || '',
      dueDate: card?.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : ''
    }
  })

  useEffect(() => {
    if (card) {
      reset({
        title: card.title,
        description: card.description || '',
        dueDate: card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : ''
      })
    }
  }, [card, reset])

  const onSubmit = async (data: UpdateCardForm) => {
    if (!card) return

    try {
      setIsLoading(true)
      
      const updateData: UpdateCardForm = {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate || undefined
      }

      await updateCard(card.id, updateData)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update card:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!card) return
    
    if (confirm('Are you sure you want to delete this card?')) {
      try {
        await deleteCard(card.id)
        onClose()
      } catch (error) {
        console.error('Failed to delete card:', error)
      }
    }
  }

  if (!card) return null

  // Get column name from current board
  const column = currentBoard?.columns.find(col => col.id === card.columnId)

  if (!card) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  {...register('title', { required: true })}
                  className="text-xl font-semibold border-none p-0 h-auto bg-transparent"
                  placeholder="Card title"
                />
              ) : (
                <h1 className="text-xl font-semibold">{card.title}</h1>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                in list <span className="font-medium">{column?.name || 'Unknown'}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="col-span-2 space-y-6">
              {/* Description */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4" />
                  <h3 className="font-medium">Description</h3>
                </div>
                
                {isEditing ? (
                  <Textarea
                    {...register('description')}
                    placeholder="Add a more detailed description..."
                    rows={4}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {card.description || (
                      <span className="italic">No description provided</span>
                    )}
                  </div>
                )}
              </div>

              {/* Checklists */}
              {card.checklists && card.checklists.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare className="h-4 w-4" />
                    <h3 className="font-medium">Checklists</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {card.checklists.map((checklist) => (
                      <div key={checklist.id} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">{checklist.title}</h4>
                        <div className="space-y-2">
                          {checklist.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={item.completed}
                                className="rounded"
                                readOnly
                              />
                              <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4" />
                  <h3 className="font-medium">Comments</h3>
                </div>
                
                <div className="space-y-3">
                  {card.comments && card.comments.length > 0 ? (
                    card.comments.map((comment) => (
                      <div key={comment.id} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                            {comment.user.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm">{comment.user.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.createdAt), 'MMM d, yyyy at h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No comments yet</p>
                  )}
                  
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Write a comment..."
                      rows={2}
                    />
                    <Button size="sm">
                      Comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Due Date */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium text-sm">Due Date</span>
                </div>
                
                {isEditing ? (
                  <Input
                    type="date"
                    {...register('dueDate')}
                    className="text-sm"
                  />
                ) : (
                  <div className="text-sm">
                    {card.dueDate ? (
                      <Badge variant="outline">
                        {format(new Date(card.dueDate), 'MMM d, yyyy')}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground italic">No due date</span>
                    )}
                  </div>
                )}
              </div>

              {/* Assignees */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium text-sm">Members</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {card.assignees.length > 0 ? (
                    card.assignees.map((assignee) => (
                      <div
                        key={assignee.id}
                        className="flex items-center gap-2 bg-muted rounded-full px-2 py-1"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {assignee.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs">{assignee.username}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">No members assigned</span>
                  )}
                  
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Labels */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4" />
                  <span className="font-medium text-sm">Labels</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {card.labels && card.labels.length > 0 ? (
                    card.labels.map((label) => (
                      <Badge
                        key={label.id}
                        style={{ backgroundColor: label.color }}
                        className="text-white"
                      >
                        {label.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">No labels</span>
                  )}
                  
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip className="h-4 w-4" />
                  <span className="font-medium text-sm">Attachments</span>
                </div>
                
                <div className="space-y-2">
                  {card.attachments && card.attachments.length > 0 ? (
                    card.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-2 p-2 border rounded">
                        <Paperclip className="h-3 w-3" />
                        <span className="text-xs truncate">{attachment.filename}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">No attachments</span>
                  )}
                  
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Plus className="h-3 w-3 mr-2" />
                    Add attachment
                  </Button>
                </div>
              </div>

              {/* Custom Fields */}
              {card.customFields && card.customFields.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">Custom Fields</span>
                  </div>
                  
                  <div className="space-y-2">
                    {card.customFields.map((field) => (
                      <div key={field.id} className="text-sm">
                        <span className="font-medium">{field.name}:</span>{' '}
                        <span className="text-muted-foreground">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </Modal>
  )
}