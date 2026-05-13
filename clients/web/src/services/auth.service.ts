import type {
  AuthResponse,
  RegisterResponse,
  LoginDTO,
  RegisterDTO,
} from '../types'
import { http } from './http'

export const authService = {
  async login(data: LoginDTO): Promise<AuthResponse> {
    const res = await http.post<AuthResponse>('/auth/login', data)
    return res.data
  },

  async register(data: RegisterDTO): Promise<RegisterResponse> {
    const res = await http.post<RegisterResponse>('/auth/register', data)
    return res.data
  },
}
