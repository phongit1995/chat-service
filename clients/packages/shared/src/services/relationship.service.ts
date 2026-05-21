import type { ApiResponse } from '../types'
import { http } from './http'

export interface RelationshipResponse {
  id: string
  requesterId: string
  addresseeId: string
  status: string
  createdAt: string
  actionedAt?: string
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
}
