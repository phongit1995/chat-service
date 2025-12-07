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
    accessToken: string
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
  identifier: string
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
  avatarURL?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  lastMessage?: Message
  members?: User[]
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
