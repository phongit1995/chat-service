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
  full_name?: string
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
  clientMsgId?: string
}

export interface MessagesListResponse {
  messages: Message[]
  total: number
}

export interface OtherUserBrief {
  id: string
  username: string
  fullName?: string
  avatar?: string
  bio?: string
  isOnline?: boolean
  lastActiveAt?: string
}

export interface Conversation {
  id: string
  type: string
  name?: string
  avatar?: string
  lastMessageText?: string
  lastMessageAt?: string
  lastMessageSenderId?: string
  lastMessageSenderName?: string
  isLastMessageFromMe?: boolean
  seen?: boolean
  unreadCount?: number
  participantCount?: number
  otherUser?: OtherUserBrief
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
  clientMsgId?: string
}

export interface CreateGroupConversationDTO {
  name: string
  participantIds: string[]
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
  conversationId: string
  userId: string
  username: string
  time: string
}

export interface ConversationParticipant {
  userId: string
  username: string
  avatar: string
}

export interface ConversationCreatedData extends Conversation {
  participants?: ConversationParticipant[]
}

export interface ConversationUpdatedData extends Conversation {
  participants?: ConversationParticipant[]
}

export interface ConversationDeletedData {
  conversationId: string
}

export const WebSocketEventType = {
  // Message events
  NEW_MESSAGE: 'NEW_MESSAGE',  // Backend uses NEW_MESSAGE for created messages
  MESSAGE_UPDATED: 'MESSAGE_UPDATED',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  
  // Conversation events
  CONVERSATION_CREATED: 'CONVERSATION_CREATED',
  CONVERSATION_UPDATED: 'CONVERSATION_UPDATED',
  CONVERSATION_DELETED: 'CONVERSATION_DELETED',
  
  // User events
  USER_TYPING: 'USER_TYPING',
  USER_STOP_TYPING: 'USER_STOP_TYPING',
} as const

export type WebSocketEventTypeKeys = keyof typeof WebSocketEventType
