export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY'

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  HAHA: '😂',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😡',
}

export const REACTION_ORDER: ReactionType[] = ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY']

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
  reactions?: Record<string, string[]>
}

export interface MessagesListResponse {
  messages: Message[]
  total: number
}

export interface CreateMessageDTO {
  conversationId: string
  content: string
  messageType?: string
  metadata?: string
  clientMsgId?: string
}

export interface ImageMetadata {
  url: string
  mimeType: string
  size: number
  width: number
  height: number
  fileName?: string
  _localBlob?: boolean
}

