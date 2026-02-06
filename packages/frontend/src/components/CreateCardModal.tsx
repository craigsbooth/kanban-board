import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useBoardStore } from '@/store/boardStore'
import { CreateCardForm, Priority, IssueType } from '@/types'
import { FeatureGate } from '@/components/FeatureGate'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'

interface CreateCardModalProps {
  isOpen: boolean
  onClose: () => void
  columnId: string
  boardId: string
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'highest', label: 'Highest' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'lowest', label: 'Lowest' },
]

const ISSUE_TYPE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: 'story', label: 'Story' },
  { value: 'bug', label: 'Bug' },
  { value: 'task', label: 'Task' },
  { value: 'epic', label: 'Epic' },
]

export function CreateCardModal({ isOpen, onClose, columnId, boardId }: CreateCardModalProps) {
  const { createCard, currentBoard } = useBoardStore()
  const [isLoading, setIsLoading] = useState(false)
  
  const { 
    visibility, 
    operations, 
    getStoryPointsScale, 
    getDefaultIssueType 
  } = useFeatureVisibility(currentBoard?.agileConfig)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateCardForm>({
    defaultValues: {
      title: '',
      description: '',
      columnId,
      boardId,
      priority: 'medium',
      issueType: getDefaultIssueType() as IssueType,
    }
  })

  const onSubmit = async (data: CreateCardForm) => {
    try {
      setIsLoading(true)
      
      await createCard({
        ...data,
        columnId,
        boardId
      })
      
      reset()
      onClose()
    } catch (error) {
      console.error('Failed to create card:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Card" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Title *
          </label>
          <Input
            id="title"
            {...register('title', { required: 'Title is required' })}
            placeholder="Enter card title"
            error={errors.title?.message}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description
          </label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Add a description (optional)"
            rows={4}
          />
        </div>

        {/* Agile Features Section */}
        <div className="space-y-4 pt-4 border-t">
          <FeatureGate feature="priorities" agileConfig={currentBoard?.agileConfig}>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium mb-2">
                Priority
              </label>
              <select
                id="priority"
                {...register('priority')}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                {PRIORITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </FeatureGate>

          <div>
            <label htmlFor="issueType" className="block text-sm font-medium mb-2">
              Issue Type
            </label>
            <select
              id="issueType"
              {...register('issueType')}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              {ISSUE_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <FeatureGate feature="storyPoints" agileConfig={currentBoard?.agileConfig}>
            <div>
              <label htmlFor="storyPoints" className="block text-sm font-medium mb-2">
                Story Points
              </label>
              <select
                id="storyPoints"
                {...register('storyPoints', { 
                  setValueAs: (value) => value === '' ? undefined : parseInt(value) 
                })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">No estimate</option>
                {getStoryPointsScale().map(points => (
                  <option key={points} value={points}>
                    {points} {points === 1 ? 'point' : 'points'}
                  </option>
                ))}
              </select>
            </div>
          </FeatureGate>

          <FeatureGate feature="timeTracking" agileConfig={currentBoard?.agileConfig}>
            <div>
              <label htmlFor="originalEstimate" className="block text-sm font-medium mb-2">
                Original Estimate (hours)
              </label>
              <Input
                id="originalEstimate"
                type="number"
                min="0"
                step="0.5"
                {...register('originalEstimate', { 
                  setValueAs: (value) => value === '' ? undefined : parseFloat(value) 
                })}
                placeholder="Enter time estimate"
              />
            </div>
          </FeatureGate>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Card'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}