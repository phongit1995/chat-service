import type {
  ApiResponse,
  SearchUsersResponse,
  UpdateProfileDTO,
  UploadImageResponse,
  User,
  UserPresence,
  UserPublicProfile,
} from '../types'
import { http } from './http'

export const userService = {
  async getProfile(): Promise<ApiResponse<User>> {
    const res = await http.get<ApiResponse<User>>('/user/me')
    return res.data
  },

  async updateProfile(data: UpdateProfileDTO): Promise<ApiResponse<User>> {
    const res = await http.put<ApiResponse<User>>('/user/me', data)
    return res.data
  },

  async searchUsers(
    query: string,
    limit = 20,
    signal?: AbortSignal,
  ): Promise<ApiResponse<SearchUsersResponse>> {
    const res = await http.get<ApiResponse<SearchUsersResponse>>('/user/search', {
      params: { q: query, limit },
      signal,
    })
    return res.data
  },

  async getUserInfo(userId: string): Promise<ApiResponse<UserPublicProfile>> {
    const res = await http.get<ApiResponse<UserPublicProfile>>(`/user/${userId}`)
    return res.data
  },

  async getPresenceBatch(userIds: string[]): Promise<ApiResponse<{ users: UserPresence[] }>> {
    const res = await http.post<ApiResponse<{ users: UserPresence[] }>>('/user/presence', { userIds })
    return res.data
  },

  async uploadImage(file: File): Promise<ApiResponse<UploadImageResponse>> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await http.post<ApiResponse<UploadImageResponse>>(
      '/user/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return res.data
  },
}
