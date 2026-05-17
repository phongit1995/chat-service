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

export interface UploadMessageImageResponse {
  url: string
  mimeType: string
  size: number
  width: number
  height: number
  fileName: string
}
