import { io, Socket } from 'socket.io-client'
import type {
  ConversationDeletedData,
  ConversationCreatedData,
  ConversationUpdatedData,
  MessageCreatedEventData,
  MessageDeletedEventData,
  MessageUpdatedEventData,
  UserTypingData,
  WebSocketEventPayloadMap,
  WebSocketMessage,
} from '../types/realtime'
import { WebSocketClientEvent, WebSocketEventType, WebSocketTransportEvent } from '../types/realtime'
import env from '../config/env'

class SocketService {
  private socket: Socket | null = null
  private listeners = new Map<string, Set<(data: unknown) => void>>()
  private pingInterval: ReturnType<typeof setInterval> | null = null

  connect(token: string) {
    if (this.socket) {
      return
    }

    this.socket = io(env.wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id)
      this.pingInterval = setInterval(() => {
        if (this.socket?.connected) {
          this.socket.emit(WebSocketClientEvent.PING)
        }
      }, 60_000)
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
      if (this.pingInterval) {
        clearInterval(this.pingInterval)
        this.pingInterval = null
      }
    })

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error)
    })

    this.socket.on(WebSocketTransportEvent.MESSAGE, (wrapper: WebSocketMessage) => {
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
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  joinConversation(_conversationId: string) {
    // server routes via user:{userId} rooms — no client join needed
  }

  leaveConversation(_conversationId: string) {
    // server routes via user:{userId} rooms — no client leave needed
  }

  on<K extends keyof WebSocketEventPayloadMap>(
    event: K,
    callback: (data: WebSocketEventPayloadMap[K]) => void,
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(callback as (data: unknown) => void)

    return () => {
      this.listeners.get(event)?.delete(callback as (data: unknown) => void)
    }
  }

  private emit<K extends keyof WebSocketEventPayloadMap>(event: K, data: WebSocketEventPayloadMap[K]) {
    this.listeners.get(event)?.forEach((callback) => callback(data))
  }

  isConnected() {
    return this.socket?.connected ?? false
  }
}

export const socketService = new SocketService()
