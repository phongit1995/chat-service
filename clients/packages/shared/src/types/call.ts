export type CallType = 'audio' | 'video'
export type CallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'declined'

export interface CallTokenResponse {
  callId: string
  roomName: string
  token: string
  wsUrl: string
  conversationId: string
  callerId: string
  callType: CallType
  status: CallStatus
  startedAt: string
}
