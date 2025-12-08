export interface User {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  avatarURL?: string
  status: string
  createdAt: string
  updatedAt: string
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

export interface ApiResponse<T> {
  success: boolean
  status: number
  traceId: string
  timestamp: string
  path: string
  data?: T
  error?: string
}

export interface LoginDTO {
  email: string
  password: string
}

export interface RegisterDTO {
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  messageType: string
  status: string
  createdAt: string
  updatedAt: string
  sender?: User
}

export interface Conversation {
  id: string
  type: string
  name?: string
  avatar?: string
  lastMessageText?: string
  lastMessageAt?: string
  unreadCount?: number
  participantCount?: number
}

export interface ConversationsListResponse {
  conversations: Conversation[]
  total: number
}

export interface ConversationDetail extends Conversation {
  messages: Message[]
}

export interface CreateMessageDTO {
  conversationId: string
  content: string
  messageType?: string
}

export interface CreateConversationDTO {
  type: string
  name?: string
  memberIds: string[]
}

export interface UserSearchResult {
  id: string
  username: string
  email: string
  fullName?: string
  avatar?: string
  bio?: string
}

export interface TempChatUser {
  id: string
  username: string
  fullName?: string
  avatar?: string
  conversationId?: string
}

export interface SearchUsersResponse {
  users: UserSearchResult[]
  total: number
}
