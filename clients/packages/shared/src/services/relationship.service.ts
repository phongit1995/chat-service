import type { ApiResponse, FriendListData } from '../types'
import { http } from './http'

export interface RelationshipUserInfo {
  id: string
  username: string
  email: string
  avatar?: string
  fullName?: string
}

export interface RelationshipResponse {
  id: string
  requesterId: string
  addresseeId: string
  status: string
  createdAt: string
  actionedAt?: string
  requester?: RelationshipUserInfo
  addressee?: RelationshipUserInfo
}

export interface RelationshipListData {
  relationships: RelationshipResponse[]
  total: number
  limit: number
  offset: number
}

export const relationshipService = {
  async sendRequest(userId: string): Promise<ApiResponse<RelationshipResponse>> {
    const res = await http.post<ApiResponse<RelationshipResponse>>('/relationships/request', { userId })
    return res.data
  },

  async respondToRequest(
    relationshipId: string,
    action: 'accept' | 'reject',
  ): Promise<ApiResponse<RelationshipResponse>> {
    const res = await http.put<ApiResponse<RelationshipResponse>>(
      `/relationships/${relationshipId}/respond`,
      { action },
    )
    return res.data
  },

  async cancelRequest(relationshipId: string): Promise<ApiResponse<unknown>> {
    const res = await http.delete<ApiResponse<unknown>>(`/relationships/${relationshipId}/cancel`)
    return res.data
  },

  async unfriend(relationshipId: string): Promise<ApiResponse<unknown>> {
    const res = await http.delete<ApiResponse<unknown>>(`/relationships/${relationshipId}/unfriend`)
    return res.data
  },

  async block(userId: string): Promise<ApiResponse<RelationshipResponse>> {
    const res = await http.post<ApiResponse<RelationshipResponse>>('/relationships/block', { userId })
    return res.data
  },

  async unblock(relationshipId: string): Promise<ApiResponse<unknown>> {
    const res = await http.delete<ApiResponse<unknown>>(`/relationships/${relationshipId}/unblock`)
    return res.data
  },

  async getFriends(limit = 50, offset = 0): Promise<ApiResponse<FriendListData>> {
    const res = await http.get<ApiResponse<FriendListData>>('/relationships/friends', {
      params: { limit, offset },
    })
    return res.data
  },

  async getPendingRequests(limit = 50, offset = 0): Promise<ApiResponse<RelationshipListData>> {
    const res = await http.get<ApiResponse<RelationshipListData>>('/relationships/pending', {
      params: { limit, offset },
    })
    return res.data
  },

  async getSentRequests(limit = 50, offset = 0): Promise<ApiResponse<RelationshipListData>> {
    const res = await http.get<ApiResponse<RelationshipListData>>('/relationships/sent', {
      params: { limit, offset },
    })
    return res.data
  },

  async getBlockedUsers(limit = 50, offset = 0): Promise<ApiResponse<RelationshipListData>> {
    const res = await http.get<ApiResponse<RelationshipListData>>('/relationships/blocked', {
      params: { limit, offset },
    })
    return res.data
  },
}
