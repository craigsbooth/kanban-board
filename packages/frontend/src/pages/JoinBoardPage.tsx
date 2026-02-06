import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Users, ArrowLeft } from 'lucide-react'
import { useBoardStore } from '@/store/boardStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function JoinBoardPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { joinBoard } = useBoardStore()
  const { isAuthenticated } = useAuthStore()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [boardInfo, setBoardInfo] = useState<any>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    if (token) {
      handleJoinBoard()
    }
  }, [token, isAuthenticated])

  const handleJoinBoard = async () => {
    if (!token) return

    try {
      setIsLoading(true)
      setError(null)
      
      const board = await joinBoard(token)
      setBoardInfo(board)
      
      // Redirect to the board after a short delay
      setTimeout(() => {
        navigate(`/board/${board.id}`)
      }, 2000)
    } catch (error: any) {
      console.error('Failed to join board:', error)
      setError(error.response?.data?.error?.message || 'Failed to join board')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">Joining board...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Unable to Join Board</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          
          <div className="space-y-2">
            <Link to="/dashboard">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
            
            <Button
              variant="outline"
              onClick={handleJoinBoard}
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (boardInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Welcome to the Board!</h1>
          <p className="text-muted-foreground mb-2">
            You've successfully joined <strong>{boardInfo.name}</strong>
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Redirecting you to the board...
          </p>
          
          <Link to={`/board/${boardInfo.id}`}>
            <Button>
              Go to Board
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Invalid Invitation</h1>
        <p className="text-muted-foreground mb-4">
          The invitation link is invalid or has expired.
        </p>
        <Link to="/dashboard">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}