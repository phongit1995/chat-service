import { create } from 'zustand'
import type { User } from '../types'
import { apiService } from '../services/api'
import { socketService } from '../services/socket'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, firstName?: string, lastName?: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.login({ email, password })
      const { token, user } = response.data

      localStorage.setItem('accessToken', token)
      localStorage.setItem('user', JSON.stringify(user))

      set({
        user,
        accessToken: token,
        isAuthenticated: true,
        isLoading: false
      })

      socketService.connect(token)
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  register: async (username, email, password, firstName, lastName) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.register({
        username,
        email,
        password,
        firstName,
        lastName
      })
      const { token, user } = response.data

      localStorage.setItem('accessToken', token)
      localStorage.setItem('user', JSON.stringify(user))

      set({
        user,
        accessToken: token,
        isAuthenticated: true,
        isLoading: false
      })

      socketService.connect(token)
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    socketService.disconnect()
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false
    })
  },

  loadUser: async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      set({ isAuthenticated: false, user: null })
      return
    }

    try {
      const response = await apiService.getProfile()
      set({
        user: response.data!,
        isAuthenticated: true,
        accessToken: token
      })

      socketService.connect(token)
    } catch (error) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false
      })
    }
  },

  clearError: () => set({ error: null }),
}))
