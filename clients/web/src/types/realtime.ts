import type { Conversation, Message } from './index'

export const WebSocketTransportEvent = {
  MESSAGE: 'message',
} as const

export const WebSocketClientEvent = {
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing',
} as const

export const WebSocketEventType = {
  NEW_MESSAGE: 'NEW_MESSAGE',
  MESSAGE_UPDATED: 'MESSAGE_UPDATED',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  CONVERSATION_CREATED: 'CONVERSATION_CREATED',
  CONVERSATION_UPDATED: 'CONVERSATION_UPDATED',
  CONVERSATION_DELETED: 'CONVERSATION_DELETED',
  USER_TYPING: 'USER_TYPING',
  USER_STOP_TYPING: 'USER_STOP_TYPING',
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

export interface WebSocketEventPayloadMap {
  [WebSocketEventType.NEW_MESSAGE]: MessageCreatedEventData
  [WebSocketEventType.MESSAGE_UPDATED]: MessageUpdatedEventData
  [WebSocketEventType.MESSAGE_DELETED]: MessageDeletedEventData
  [WebSocketEventType.CONVERSATION_CREATED]: ConversationCreatedData
  [WebSocketEventType.CONVERSATION_UPDATED]: ConversationUpdatedData
  [WebSocketEventType.CONVERSATION_DELETED]: ConversationDeletedData
  [WebSocketEventType.USER_TYPING]: UserTypingData
  [WebSocketEventType.USER_STOP_TYPING]: UserTypingData
}
