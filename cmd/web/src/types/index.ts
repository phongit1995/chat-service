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
  senderName?: string
  senderAvatar?: string
  content: string
  type: string
  status: string
  createdAt: string
  updatedAt: string
  replyToId?: string
  metadata?: string
}

export interface MessagesListResponse {
  messages: Message[]
  total: number
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

export interface WebSocketMessage<T = any> {
  type: string
  data: T
}

export interface MessageCreatedEventData {
  conversation: Conversation
  message: Message
}

export interface MessageUpdatedEventData {
  conversation: Conversation
  message: Message
}

export interface MessageDeletedEventData {
  conversation: Conversation
  messageId: string
}

export interface UserTypingData {
  userId: string
  conversationId: string
  isTyping: boolean
}

export interface UserStatusData {
  userId: string
  status: string
}

export interface ConversationCreatedData extends Conversation {}

export const WebSocketEventType = {
  MESSAGE_CREATED: 'MESSAGE_CREATED',
  NEW_MESSAGE: 'NEW_MESSAGE',
  MESSAGE_UPDATED: 'MESSAGE_UPDATED',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  CONVERSATION_CREATED: 'CONVERSATION_CREATED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  USER_TYPING: 'USER_TYPING',
  USER_STOP_TYPING: 'USER_STOP_TYPING',
} as const

export type WebSocketEventTypeKeys = keyof typeof WebSocketEventType
