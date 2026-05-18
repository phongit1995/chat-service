import type { Conversation, Message } from './index'

export const WebSocketTransportEvent = {
  MESSAGE: 'message',
} as const

export const WebSocketClientEvent = {
  PING: 'ping',
} as const

export const WebSocketEventType = {
  NEW_MESSAGE: 'NEW_MESSAGE',
  MESSAGE_UPDATED: 'MESSAGE_UPDATED',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  MESSAGE_REACTION_UPDATED: 'MESSAGE_REACTION_UPDATED',
  CONVERSATION_CREATED: 'CONVERSATION_CREATED',
  CONVERSATION_UPDATED: 'CONVERSATION_UPDATED',
  CONVERSATION_DELETED: 'CONVERSATION_DELETED',
  USER_TYPING: 'USER_TYPING',
  USER_STOP_TYPING: 'USER_STOP_TYPING',
  INCOMING_CALL: 'INCOMING_CALL',
  CALL_ACCEPTED: 'CALL_ACCEPTED',
  CALL_DECLINED: 'CALL_DECLINED',
  CALL_ENDED: 'CALL_ENDED',
} as const

export type WebSocketEventTypeKeys = keyof typeof WebSocketEventType
export type WebSocketEventTypeValue = (typeof WebSocketEventType)[WebSocketEventTypeKeys]
export type WebSocketClientEventValue =
  (typeof WebSocketClientEvent)[keyof typeof WebSocketClientEvent]
export type WebSocketTransportEventValue =
  (typeof WebSocketTransportEvent)[keyof typeof WebSocketTransportEvent]

export interface WebSocketMessage<T = unknown> {
  type: WebSocketEventTypeValue | string
  data: T
}

export interface MessageCreatedEventData {
  conversation: Conversation
  message: Message
}

export interface MessageUpdatedEventData {
  conversation: Conversation
  message: Message
}

export interface MessageDeletedEventData {
  conversation: Conversation
  messageId: string
}

export interface MessageReactionUpdatedEventData {
  conversationId: string
  messageId: string
  reactions: Record<string, string[]>
  actorUserId: string
  type: string
  action: 'added' | 'removed'
}

export interface UserTypingData {
  conversationId: string
  userId: string
  username: string
  time: string
}

export interface ConversationParticipant {
  userId: string
  username: string
  avatar: string
}

export interface ConversationCreatedData extends Conversation {
  participants?: ConversationParticipant[]
}

export interface ConversationUpdatedData extends Conversation {
  participants?: ConversationParticipant[]
}

export interface ConversationDeletedData {
  conversationId: string
}

export interface IncomingCallData {
  callId: string
  conversationId: string
  callerId: string
  callType: 'audio' | 'video'
  roomName: string
  startedAt: string
}

export interface CallAcceptedData {
  callId: string
  conversationId: string
  answeredBy: string
}

export interface CallDeclinedData {
  callId: string
  conversationId: string
  declinedBy: string
}

export interface CallEndedData {
  callId: string
  conversationId: string
  endedBy?: string
  status: 'ended' | 'missed' | 'declined'
  durationSeconds: number
}

export interface WebSocketEventPayloadMap {
  [WebSocketEventType.NEW_MESSAGE]: MessageCreatedEventData
  [WebSocketEventType.MESSAGE_UPDATED]: MessageUpdatedEventData
  [WebSocketEventType.MESSAGE_DELETED]: MessageDeletedEventData
  [WebSocketEventType.MESSAGE_REACTION_UPDATED]: MessageReactionUpdatedEventData
  [WebSocketEventType.CONVERSATION_CREATED]: ConversationCreatedData
  [WebSocketEventType.CONVERSATION_UPDATED]: ConversationUpdatedData
  [WebSocketEventType.CONVERSATION_DELETED]: ConversationDeletedData
  [WebSocketEventType.USER_TYPING]: UserTypingData
  [WebSocketEventType.USER_STOP_TYPING]: UserTypingData
  [WebSocketEventType.INCOMING_CALL]: IncomingCallData
  [WebSocketEventType.CALL_ACCEPTED]: CallAcceptedData
  [WebSocketEventType.CALL_DECLINED]: CallDeclinedData
  [WebSocketEventType.CALL_ENDED]: CallEndedData
}
