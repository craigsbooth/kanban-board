import { useState, useEffect } from 'react'
import { Users, Copy, UserPlus, MoreHorizontal, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useBoardStore } from '@/store/boardStore'
import { useAuthStore } from '@/store/authStore'
import { BoardMember, BoardMemberRole } from '@/types'
import toast from 'react-hot-toast'

interface BoardMembersModalProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
}

export function BoardMembersModal({ isOpen, onClose, boardId }: BoardMembersModalProps) {
  const { 
    generateInviteLink, 
    fetchBoardMembers, 
    updateMemberRole, 
    removeMember,
    currentBoard 
  } = useBoardStore()
  const { user } = useAuthStore()
  
  const [members, setMembers] = useState<BoardMember[]>([])
  const [inviteLink, setInviteLink] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)

  useEffect(() => {
    if (isOpen && boardId) {
      loadMembers()
    }
  }, [isOpen, boardId])

  const loadMembers = async () => {
    try {
      setIsLoading(true)
      const boardMembers = await fetchBoardMembers(boardId)
      setMembers(boardMembers)
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateInviteLink = async () => {
    try {
      setIsGeneratingLink(true)
      const { inviteLink } = await generateInviteLink(boardId)
      setInviteLink(inviteLink)
    } catch (error) {
      console.error('Failed to generate invite link:', error)
    } finally {
      setIsGeneratingLink(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast.success('Invite link copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleRoleChange = async (memberId: string, userId: string, newRole: string) => {
    try {
      await updateMemberRole(boardId, userId, newRole)
      await loadMembers() // Refresh members list
    } catch (error) {
      console.error('Failed to update member role:', error)
    }
  }

  const handleRemoveMember = async (memberId: string, userId: string, username: string) => {
    if (confirm(`Are you sure you want to remove ${username} from this board?`)) {
      try {
        await removeMember(boardId, userId)
        await loadMembers() // Refresh members list
      } catch (error) {
        console.error('Failed to remove member:', error)
      }
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'default'
      case 'ADMIN':
        return 'secondary'
      case 'EDIT':
        return 'outline'
      case 'VIEW':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const canManageMembers = currentBoard?.ownerId === user?.id || 
    members.find(m => m.userId === user?.id)?.role === 'ADMIN'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Board Members" size="md">
      <div className="p-6 space-y-6">
        {/* Invite Section */}
        {canManageMembers && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <h3 className="font-medium">Invite Members</h3>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={handleGenerateInviteLink}
                disabled={isGeneratingLink}
                className="w-full"
              >
                {isGeneratingLink ? 'Generating...' : 'Generate Invite Link'}
              </Button>
              
              {inviteLink && (
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <h3 className="font-medium">Members ({members.length})</h3>
          </div>
          
          {isLoading ? (
            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground">Loading members...</div>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                      {member.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{member.user.username}</div>
                      <div className="text-sm text-muted-foreground">{member.user.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role}
                    </Badge>
                    
                    {canManageMembers && member.role !== 'OWNER' && member.userId !== user?.id && (
                      <div className="flex items-center gap-1">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, member.userId, e.target.value)}
                          className="text-xs border rounded px-2 py-1"
                        >
                          <option value="VIEW">View</option>
                          <option value="EDIT">Edit</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id, member.userId, member.user.username)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {members.length === 0 && (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">No members found</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}