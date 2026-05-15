import type { ApiResponse } from '../types'
import type { CallTokenResponse, CallType } from '../types/call'
import { http } from './http'

export const callService = {
  async start(conversationId: string, callType: CallType): Promise<ApiResponse<CallTokenResponse>> {
    const res = await http.post<ApiResponse<CallTokenResponse>>('/calls/start', {
      conversationId,
      callType,
    })
    return res.data
  },

  async answer(callId: string): Promise<ApiResponse<CallTokenResponse>> {
    const res = await http.post<ApiResponse<CallTokenResponse>>(`/calls/${callId}/answer`)
    return res.data
  },

  async decline(callId: string): Promise<ApiResponse<void>> {
    const res = await http.post<ApiResponse<void>>(`/calls/${callId}/decline`)
    return res.data
  },

  async end(callId: string): Promise<ApiResponse<void>> {
    const res = await http.post<ApiResponse<void>>(`/calls/${callId}/end`)
    return res.data
  },
}
