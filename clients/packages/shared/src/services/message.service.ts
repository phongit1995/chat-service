import type {
  ApiResponse,
  CreateMessageDTO,
  Message,
  MessagesListResponse,
} from '../types'
import { http } from './http'

export const messageService = {
  async getMessages(
    conversationId: string,
    limit = 50,
    before?: string,
  ): Promise<ApiResponse<MessagesListResponse>> {
    const res = await http.get<ApiResponse<MessagesListResponse>>(
      `/messages/${conversationId}`,
      { params: { limit, before } },
    )
    return res.data
  },

  async sendMessage(data: CreateMessageDTO): Promise<ApiResponse<Message>> {
    const body = {
      conversationId: data.conversationId,
      content: data.content,
      type: data.messageType || 'text',
      ...(data.metadata ? { metadata: data.metadata } : {}),
      ...(data.clientMsgId ? { clientMsgId: data.clientMsgId } : {}),
      ...(data.replyToId ? { replyToId: data.replyToId } : {}),
    }
    const res = await http.post<ApiResponse<Message>>('/messages', body)
    return res.data
  },

  async updateMessage(
    conversationId: string,
    messageId: string,
    content: string,
  ): Promise<ApiResponse<Message>> {
    const res = await http.patch<ApiResponse<Message>>(
      `/messages/${conversationId}/${messageId}`,
      { content },
    )
    return res.data
  },

  async deleteMessage(
    conversationId: string,
    messageId: string,
  ): Promise<ApiResponse<void>> {
    const res = await http.delete<ApiResponse<void>>(
      `/messages/${conversationId}/${messageId}`,
    )
    return res.data
  },

  async toggleReaction(
    conversationId: string,
    messageId: string,
    type: string,
  ): Promise<ApiResponse<Message>> {
    const res = await http.post<ApiResponse<Message>>(
      `/messages/${conversationId}/${messageId}/reactions`,
      { type },
    )
    return res.data
  },

  async sendImageMessage(
    conversationId: string,
    file: File,
    clientMsgId?: string,
    onProgress?: (pct: number) => void,
  ): Promise<ApiResponse<Message>> {
    const form = new FormData()
    form.append('conversationId', conversationId)
    form.append('file', file)
    if (clientMsgId) form.append('clientMsgId', clientMsgId)
    const res = await http.post<ApiResponse<Message>>(
      '/messages/images',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
        },
      },
    )
    return res.data
  },

  async sendDirectMessage(
    recipientId: string,
    content: string,
    type = 'text',
    clientMsgId?: string,
  ): Promise<ApiResponse<Message>> {
    const res = await http.post<ApiResponse<Message>>('/messages/direct', {
      recipientId,
      content,
      type,
      ...(clientMsgId ? { clientMsgId } : {}),
    })
    return res.data
  },
}
