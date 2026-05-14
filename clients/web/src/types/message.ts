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

export interface CreateMessageDTO {
  conversationId: string
  content: string
  messageType?: string
  clientMsgId?: string
}
