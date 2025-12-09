import axios, { AxiosInstance } from 'axios'
import type { AuthResponse, ApiResponse, LoginDTO, RegisterDTO, User, Conversation, ConversationsListResponse, MessagesListResponse, Message, CreateMessageDTO, CreateConversationDTO, ConversationDetail, UserSearchResult, SearchUsersResponse } from '../types'
import env from '../config/env'

class ApiService {
  private api: AxiosInstance

  constructor() {
    const baseURL = `${env.apiBaseUrl}/api`

    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  async login(data: LoginDTO): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', data)
    return response.data
  }

  async register(data: RegisterDTO): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/register', data)
    return response.data
  }

  async getProfile(): Promise<ApiResponse<User>> {
    const response = await this.api.get<ApiResponse<User>>('/user/profile')
    return response.data
  }

  async getConversations(): Promise<ApiResponse<ConversationsListResponse>> {
    const response = await this.api.get<ApiResponse<ConversationsListResponse>>('/conversations')
    return response.data
  }

  async getConversation(id: string): Promise<ApiResponse<ConversationDetail>> {
    const response = await this.api.get<ApiResponse<ConversationDetail>>(`/conversations/${id}`)
    return response.data
  }

  async createConversation(data: CreateConversationDTO): Promise<ApiResponse<Conversation>> {
    const response = await this.api.post<ApiResponse<Conversation>>('/conversations', data)
    return response.data
  }


  async sendMessage(data: CreateMessageDTO): Promise<ApiResponse<Message>> {
    const requestData = {
      conversationId: data.conversationId,
      content: data.content,
      type: data.messageType || 'text'
    }
    const response = await this.api.post<ApiResponse<Message>>('/messages', requestData)
    return response.data
  }

  async sendDirectMessage(recipientId: string, content: string, type = 'text'): Promise<ApiResponse<Message>> {
    const response = await this.api.post<ApiResponse<Message>>('/messages/direct', {
      recipientId,
      content,
      type
    })
    return response.data
  }

  async getMessages(conversationId: string, limit = 50, before?: string): Promise<ApiResponse<MessagesListResponse>> {
    const response = await this.api.get<ApiResponse<MessagesListResponse>>(`/messages/${conversationId}`, {
      params: { limit, before }
    })
    return response.data
  }

  async searchUsers(query: string, limit = 20): Promise<ApiResponse<SearchUsersResponse>> {
    const response = await this.api.get<ApiResponse<SearchUsersResponse>>('/users/search', {
      params: { q: query, limit }
    })
    return response.data
  }

  async checkDirectConversation(recipientId: string): Promise<ApiResponse<Conversation>> {
    const response = await this.api.get<ApiResponse<Conversation>>('/conversations/direct/check', {
      params: { recipientId }
    })
    return response.data
  }

  async createDirectConversation(recipientId: string): Promise<ApiResponse<Conversation>> {
    const response = await this.api.post<ApiResponse<Conversation>>('/conversations/direct', {
      recipientId
    })
    return response.data
  }
}

export const apiService = new ApiService()
