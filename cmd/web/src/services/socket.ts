import { io, Socket } from 'socket.io-client'
import type {
  WebSocketMessage,
  MessageCreatedEventData,
  MessageUpdatedEventData,
  MessageDeletedEventData,
  UserTypingData,
  UserStatusData,
  ConversationCreatedData,
  ConversationUpdatedData,
  ConversationDeletedData
} from '../types'
import { WebSocketEventType } from '../types'
import env from '../config/env'

class SocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Set<Function>> = new Map()

  connect(token: string) {
    if (this.socket?.connected) {
      return
    }

    this.socket = io(env.wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id)
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error)
    })

    this.socket.on('message', (wrapper: WebSocketMessage) => {
      console.log('WebSocket event received:', wrapper.type, wrapper.data)
      
      switch (wrapper.type) {
        // Message events
        case WebSocketEventType.NEW_MESSAGE:
          this.emit(WebSocketEventType.NEW_MESSAGE, wrapper.data as MessageCreatedEventData)
          break
          
        case WebSocketEventType.MESSAGE_UPDATED:
          this.emit(WebSocketEventType.MESSAGE_UPDATED, wrapper.data as MessageUpdatedEventData)
          break
          
        case WebSocketEventType.MESSAGE_DELETED:
          this.emit(WebSocketEventType.MESSAGE_DELETED, wrapper.data as MessageDeletedEventData)
          break
          
        // Conversation events
        case WebSocketEventType.CONVERSATION_CREATED:
          this.emit(WebSocketEventType.CONVERSATION_CREATED, wrapper.data as ConversationCreatedData)
          break
          
        case WebSocketEventType.CONVERSATION_UPDATED:
          this.emit(WebSocketEventType.CONVERSATION_UPDATED, wrapper.data as ConversationUpdatedData)
          break
          
        case WebSocketEventType.CONVERSATION_DELETED:
          this.emit(WebSocketEventType.CONVERSATION_DELETED, wrapper.data as ConversationDeletedData)
          break
          
        // User events
        case WebSocketEventType.USER_ONLINE:
          this.emit(WebSocketEventType.USER_ONLINE, wrapper.data as UserStatusData)
          break
          
        case WebSocketEventType.USER_OFFLINE:
          this.emit(WebSocketEventType.USER_OFFLINE, wrapper.data as UserStatusData)
          break
          
        case WebSocketEventType.USER_TYPING:
          this.emit(WebSocketEventType.USER_TYPING, wrapper.data as UserTypingData)
          break
          
        case WebSocketEventType.USER_STOP_TYPING:
          this.emit(WebSocketEventType.USER_STOP_TYPING, wrapper.data as UserTypingData)
          break
          
        default:
          console.warn('Unknown WebSocket event type:', wrapper.type)
      }
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.listeners.clear()
    }
  }

  sendTyping(conversationId: string, isTyping: boolean) {
    this.socket?.emit('TYPING', { conversationId, isTyping })
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(callback)

    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data))
  }

  isConnected() {
    return this.socket?.connected ?? false
  }
}

export const socketService = new SocketService()
