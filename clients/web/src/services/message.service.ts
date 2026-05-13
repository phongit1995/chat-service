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
      ...(data.clientMsgId ? { clientMsgId: data.clientMsgId } : {}),
    }
    const res = await http.post<ApiResponse<Message>>('/messages', body)
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
