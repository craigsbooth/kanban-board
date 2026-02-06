import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings, Users, Palette, Zap, Trash2 } from 'lucide-react'
import { useBoardStore } from '@/store/boardStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Ten10Logo } from '@/components/ui/Ten10Logo'
import { BoardAgileSettings } from '@/components/BoardAgileSettings'
import { AgileConfig } from '@/types'
import toast from 'react-hot-toast'

type SettingsTab = 'general' | 'agile' | 'members' | 'danger'

export default function BoardSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentBoard, isLoading, fetchBoard, updateBoard, deleteBoard } = useBoardStore()
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [boardForm, setBoardForm] = useState({
    name: '',
    description: '',
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      fetchBoard(id)
    }
  }, [id, fetchBoard])

  useEffect(() => {
    if (currentBoard) {
      setBoardForm({
        name: currentBoard.name,
        description: currentBoard.description || '',
      })
    }
  }, [currentBoard])

  const handleUpdateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentBoard || !boardForm.name.trim()) {
      toast.error('Board name is required')
      return
    }

    try {
      setIsUpdating(true)
      await updateBoard(currentBoard.id, {
        name: boardForm.name.trim(),
        description: boardForm.description.trim() || undefined,
      })
    } catch (error) {
      toast.error('Failed to update board')
      console.error('Update error:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateAgileConfig = async (agileConfig: Partial<AgileConfig>) => {
    if (!currentBoard) return
    
    await updateBoard(currentBoard.id, { agileConfig })
  }

  const handleDeleteBoard = async () => {
    if (!currentBoard) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${currentBoard.name}"? This action cannot be undone and will permanently delete all cards, comments, and attachments.`
    )
    
    if (!confirmed) return

    const doubleConfirm = window.confirm(
      'This is your final warning. Type "DELETE" to confirm board deletion.'
    )
    
    if (!doubleConfirm) return

    try {
      setIsDeleting(true)
      await deleteBoard(currentBoard.id)
      navigate('/dashboard')
    } catch (error) {
      toast.error('Failed to delete board')
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'agile', label: 'Agile Features', icon: Zap },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
  ] as const

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
              <Link to={`/board/${currentBoard.id}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Board
                </Button>
              </Link>
              
              <div className="border-l pl-4">
                <h1 className="text-2xl font-bold">Board Settings</h1>
                <p className="text-muted-foreground">
                  {currentBoard.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-4xl">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">General Settings</h2>
                  <p className="text-muted-foreground">
                    Manage basic board information and settings.
                  </p>
                </div>

                <Card className="p-6">
                  <form onSubmit={handleUpdateBoard} className="space-y-4">
                    <div>
                      <label htmlFor="boardName" className="block text-sm font-medium mb-2">
                        Board Name
                      </label>
                      <Input
                        id="boardName"
                        type="text"
                        value={boardForm.name}
                        onChange={(e) => setBoardForm(prev => ({ ...prev, name: e.target.value }))}
                        disabled={isUpdating}
                        placeholder="Enter board name..."
                      />
                    </div>

                    <div>
                      <label htmlFor="boardDescription" className="block text-sm font-medium mb-2">
                        Description
                      </label>
                      <Input
                        id="boardDescription"
                        type="text"
                        value={boardForm.description}
                        onChange={(e) => setBoardForm(prev => ({ ...prev, description: e.target.value }))}
                        disabled={isUpdating}
                        placeholder="What's this board about?"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isUpdating || !boardForm.name.trim()}>
                        {isUpdating ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </div>
                  </form>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-medium mb-4">Board Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Template:</span>
                      <span className="ml-2 capitalize">{currentBoard.templateType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <span className="ml-2">
                        {new Date(currentBoard.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Owner:</span>
                      <span className="ml-2">{currentBoard.owner.username}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Members:</span>
                      <span className="ml-2">{currentBoard.members.length + 1}</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'agile' && (
              <BoardAgileSettings
                board={currentBoard}
                onSave={handleUpdateAgileConfig}
              />
            )}

            {activeTab === 'members' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Member Management</h2>
                  <p className="text-muted-foreground">
                    Manage board members and their permissions.
                  </p>
                </div>

                <Card className="p-6">
                  <p className="text-muted-foreground">
                    Member management functionality will be implemented in a future update.
                    For now, you can manage members from the board view.
                  </p>
                </Card>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2 text-destructive">Danger Zone</h2>
                  <p className="text-muted-foreground">
                    Irreversible and destructive actions.
                  </p>
                </div>

                <Card className="p-6 border-destructive">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-destructive mb-2">Delete Board</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Once you delete a board, there is no going back. This will permanently delete
                        the board, all its cards, comments, attachments, and remove all member access.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteBoard}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Board
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}