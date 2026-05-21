import { create } from 'zustand'
import toast from 'react-hot-toast'
import type { ApiResponse, UpdateProfileDTO, UploadImageResponse, User } from '../types'
import { authService } from '../services/auth.service'
import { userService } from '../services/user.service'
import { socketService } from '../services/socket'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, fullName?: string) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  setUser: (user: User) => void
  updateProfile: (data: UpdateProfileDTO) => Promise<ApiResponse<User>>
  uploadAvatar: (file: File) => Promise<ApiResponse<UploadImageResponse>>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authService.login({ email, password })
      const { token, refreshToken, user } = response.data

      localStorage.setItem('accessToken', token)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))

      set({
        user,
        accessToken: token,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      })

      socketService.connect(token)
      toast.success(`Welcome back, ${user.username}!`)
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed'
      set({ error: errorMessage, isLoading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  register: async (username, email, password, fullName) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authService.register({
        username,
        email,
        password,
        full_name: fullName,
      })

      set({ isLoading: false })
      toast.success(response.data.message || 'Account created successfully! Please login to continue.')
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed'
      set({ error: errorMessage, isLoading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  logout: async () => {
    await authService.logout()
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    socketService.disconnect()
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
    toast.success('Logged out successfully')
  },

  loadUser: async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      set({ isAuthenticated: false, user: null })
      return
    }

    try {
      const response = await userService.getProfile()
      set({
        user: response.data!,
        isAuthenticated: true,
        accessToken: token,
        refreshToken: localStorage.getItem('refreshToken'),
      })

      socketService.connect(token)
    } catch (_error) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      })
    }
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },

  updateProfile: async (data) => {
    const response = await userService.updateProfile(data)
    if (response.success && response.data) {
      localStorage.setItem('user', JSON.stringify(response.data))
      set({ user: response.data })
    }
    return response
  },

  uploadAvatar: async (file) => {
    return await userService.uploadImage(file)
  },

  clearError: () => set({ error: null }),
}))
