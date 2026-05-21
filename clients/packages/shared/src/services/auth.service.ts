import axios from 'axios'
import type {
  AuthResponse,
  RegisterResponse,
  LoginDTO,
  RegisterDTO,
} from '../types'
import env from '../config/env'
import { http } from './http'

export interface RefreshResponse {
  success: boolean
  data: { token: string; refreshToken: string }
}

export const authService = {
  async login(data: LoginDTO): Promise<AuthResponse> {
    const res = await http.post<AuthResponse>('/auth/login', data)
    return res.data
  },

  async register(data: RegisterDTO): Promise<RegisterResponse> {
    const res = await http.post<RegisterResponse>('/auth/register', data)
    return res.data
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await http.post('/auth/change-password', { currentPassword, newPassword })
  },

  async logout(): Promise<void> {
    try {
      await http.post('/auth/logout')
    } catch {
      // best-effort: ignore network errors so local state still clears
    }
  },

  async refresh(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    const res = await axios.post<RefreshResponse>(
      `${env.apiBaseUrl}/api/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    )
    return res.data.data
  },
}
