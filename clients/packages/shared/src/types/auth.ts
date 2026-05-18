import type { User } from './user'

export interface LoginDTO {
  email: string
  password: string
}

export interface RegisterDTO {
  username: string
  email: string
  password: string
  full_name?: string
}

export interface RegisterResponse {
  success: boolean
  status: number
  traceId: string
  timestamp: string
  path: string
  data: {
    user: User
    message: string
  }
}

export interface AuthResponse {
  success: boolean
  status: number
  traceId: string
  timestamp: string
  path: string
  data: {
    token: string
    refreshToken: string
    user: User
  }
}
