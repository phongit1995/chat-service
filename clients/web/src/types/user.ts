export interface User {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  avatarURL?: string
  avatar?: string
  phone?: string
  fullName?: string
  bio?: string
  dateOfBirth?: string
  customInfo?: Record<string, any>
  status: string
  createdAt: string
  updatedAt: string
}

export interface UserBase {
  id: string
  username: string
  fullName?: string
  avatar?: string
  bio?: string
}

export interface UserSearchResult extends UserBase {
  isOnline?: boolean
}

export interface UserPublicProfile extends UserBase {
  isOnline: boolean
  lastActiveAt?: string
  createdAt?: string
}

export interface TempChatUser {
  id: string
  username: string
  fullName?: string
  avatar?: string
  conversationId?: string
}

export interface UpdateProfileDTO {
  avatar?: string
  phone?: string
  fullName?: string
  bio?: string
  dateOfBirth?: string
  customInfo?: Record<string, any>
}

export interface UploadImageResponse {
  url: string
  secureUrl: string
  publicId: string
  format: string
  width: number
  height: number
}

export interface SearchUsersResponse {
  users: UserSearchResult[]
  total: number
}
