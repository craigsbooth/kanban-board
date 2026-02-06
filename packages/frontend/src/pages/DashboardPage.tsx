import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, LogOut, User, Settings } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBoardStore } from '@/store/boardStore'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Ten10Logo } from '@/components/ui/Ten10Logo'
import { BoardTemplateSelector } from '@/components/BoardTemplateSelector'
import { formatRelativeTime } from '@/lib/utils'
import { BoardTemplate } from '@/types'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const { boards, isLoading, fetchBoards, createBoard } = useBoardStore()
  const [showCreateBoard, setShowCreateBoard] = useState(false)
  const [boardForm, setBoardForm] = useState({ 
    name: '', 
    description: '', 
    templateType: 'basic' as BoardTemplate 
  })
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])

  const handleLogout = () => {
    logout()
  }

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!boardForm.name.trim()) {
      toast.error('Board name is required')
      return
    }

    try {
      setIsCreating(true)
      const board = await createBoard({
        name: boardForm.name.trim(),
        description: boardForm.description.trim() || undefined,
        templateType: boardForm.templateType
      })
      
      // Reset form and close modal
      setBoardForm({ name: '', description: '', templateType: 'basic' })
      setShowCreateBoard(false)
      
      // Navigate to the new board
      navigate(`/board/${board.id}`)
    } catch (error) {
      toast.error('Failed to create board')
      console.error('Create board error:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCloseModal = () => {
    setBoardForm({ name: '', description: '', templateType: 'basic' })
    setShowCreateBoard(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Ten10Logo size="md" />
              <div className="border-l pl-4">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome back, {user?.username}!
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link to="/profile">
                <Button variant="outline" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-semibold">Your Boards</h2>
            <p className="text-muted-foreground">
              Manage your projects and collaborate with your team
            </p>
          </div>
          
          <Button onClick={() => setShowCreateBoard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Board
          </Button>
        </div>

        {/* Boards Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No boards yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first board to start organizing your projects
            </p>
            <Button onClick={() => setShowCreateBoard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Board
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {boards.map((board) => (
              <Link key={board.id} to={`/board/${board.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">{board.name}</CardTitle>
                    {board.description && (
                      <CardDescription className="line-clamp-2">
                        {board.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {board._count?.cards || 0} cards
                      </span>
                      <span>
                        Updated {formatRelativeTime(board.updatedAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center mt-3">
                      <div className="flex -space-x-2">
                        {board.members.slice(0, 3).map((member) => (
                          <div
                            key={member.id}
                            className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center border-2 border-background"
                            title={member.user.username}
                          >
                            {member.user.username.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {board.members.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center border-2 border-background">
                            +{board.members.length - 3}
                          </div>
                        )}
                      </div>
                      
                      {board.members.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          Only you
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
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

      {/* Create Board Modal */}
      {showCreateBoard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Board</CardTitle>
              <CardDescription>
                Choose a template and customize your board
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateBoard} className="space-y-6">
                {/* Board Template Selection */}
                <BoardTemplateSelector
                  selectedTemplate={boardForm.templateType}
                  onTemplateSelect={(template) => 
                    setBoardForm(prev => ({ ...prev, templateType: template }))
                  }
                />
                
                {/* Board Details */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="boardName" className="block text-sm font-medium mb-2">
                      Board Name *
                    </label>
                    <Input
                      id="boardName"
                      type="text"
                      placeholder="Enter board name..."
                      value={boardForm.name}
                      onChange={(e) => setBoardForm(prev => ({ ...prev, name: e.target.value }))}
                      disabled={isCreating}
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="boardDescription" className="block text-sm font-medium mb-2">
                      Description (optional)
                    </label>
                    <Input
                      id="boardDescription"
                      type="text"
                      placeholder="What's this board about?"
                      value={boardForm.description}
                      onChange={(e) => setBoardForm(prev => ({ ...prev, description: e.target.value }))}
                      disabled={isCreating}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={handleCloseModal}
                    className="flex-1"
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={isCreating || !boardForm.name.trim()}
                  >
                    {isCreating ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Board'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}