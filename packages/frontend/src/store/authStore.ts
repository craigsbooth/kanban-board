import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'
import socketService from '../lib/socket'
import toast from 'react-hot-toast'
import type { User, LoginCredentials, RegisterCredentials } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
  initializeAuth: () => Promise<void>
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true })
          
          const response = await api.post('/auth/login', credentials)
          const { user, tokens } = response.data
          
          // Store tokens
          localStorage.setItem('accessToken', tokens.accessToken)
          localStorage.setItem('refreshToken', tokens.refreshToken)
          
          // Update state
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          })
          
          // Connect to socket
          socketService.connect(tokens.accessToken)
          
          toast.success('Login successful!')
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (credentials: RegisterCredentials) => {
        try {
          set({ isLoading: true })
          
          const response = await api.post('/auth/register', credentials)
          const { user, tokens } = response.data
          
          // Store tokens
          localStorage.setItem('accessToken', tokens.accessToken)
          localStorage.setItem('refreshToken', tokens.refreshToken)
          
          // Update state
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          })
          
          // Connect to socket
          socketService.connect(tokens.accessToken)
          
          toast.success('Registration successful!')
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        // Clear tokens
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        
        // Disconnect socket
        socketService.disconnect()
        
        // Clear state
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        })
        
        toast.success('Logged out successfully')
      },

      initializeAuth: async () => {
        try {
          const accessToken = localStorage.getItem('accessToken')
          
          if (!accessToken) {
            set({ isLoading: false })
            return
          }
          
          // Verify token with server
          const response = await api.get('/auth/me')
          const { user } = response.data
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          })
          
          // Connect to socket
          socketService.connect(accessToken)
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          })
        }
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({ 
            user: { ...currentUser, ...userData } 
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)