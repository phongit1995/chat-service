import type {
  ApiResponse,
  Conversation,
  ConversationDetail,
  ConversationsListResponse,
  CreateGroupConversationDTO,
} from '../types'
import { http } from './http'

export const conversationService = {
  async getConversations(): Promise<ApiResponse<ConversationsListResponse>> {
    const res = await http.get<ApiResponse<ConversationsListResponse>>('/conversations')
    return res.data
  },

  async getConversation(id: string): Promise<ApiResponse<ConversationDetail>> {
    const res = await http.get<ApiResponse<ConversationDetail>>(`/conversations/${id}`)
    return res.data
  },

  async createGroupConversation(
    data: CreateGroupConversationDTO,
  ): Promise<ApiResponse<Conversation>> {
    const res = await http.post<ApiResponse<Conversation>>('/conversations/group', data)
    return res.data
  },

  async checkDirectConversation(recipientId: string): Promise<ApiResponse<Conversation>> {
    const res = await http.get<ApiResponse<Conversation>>('/conversations/direct/check', {
      params: { recipientId },
    })
    return res.data
  },

  async createDirectConversation(recipientId: string): Promise<ApiResponse<Conversation>> {
    const res = await http.post<ApiResponse<Conversation>>('/conversations/direct', {
      recipientId,
    })
    return res.data
  },

  async sendTypingIndicator(conversationId: string): Promise<ApiResponse<void>> {
    const res = await http.post<ApiResponse<void>>('/conversations/typing', {
      conversationId,
    })
    return res.data
  },

  async markAsRead(conversationId: string): Promise<ApiResponse<void>> {
    const res = await http.put<ApiResponse<void>>(`/conversations/${conversationId}/read`)
    return res.data
  },

  async hide(conversationId: string): Promise<ApiResponse<void>> {
    const res = await http.post<ApiResponse<void>>(`/conversations/${conversationId}/hide`)
    return res.data
  },

  async unhide(conversationId: string): Promise<ApiResponse<void>> {
    const res = await http.post<ApiResponse<void>>(`/conversations/${conversationId}/unhide`)
    return res.data
  },
}
