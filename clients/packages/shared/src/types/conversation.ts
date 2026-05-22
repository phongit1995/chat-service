import type { Message } from './message'

export const ConversationType = {
  DIRECT: 'direct',
  GROUP: 'group',
} as const

export type ConversationType = (typeof ConversationType)[keyof typeof ConversationType]

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
  type: ConversationType | string
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

export interface CreateGroupConversationDTO {
  name: string
  participantIds: string[]
}
