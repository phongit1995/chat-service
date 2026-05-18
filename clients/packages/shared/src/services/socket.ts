import { io, Socket } from 'socket.io-client'
import type {
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
      console.log('Socket already connected, skipping')
      return
    }

    console.log('Socket connecting to', env.wsUrl, 'with token', token?.slice(0, 20) + '...')
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
      if (!wrapper?.type) {
        console.warn('WebSocket message without type:', wrapper)
        return
      }
      const known = Object.values(WebSocketEventType) as string[]
      if (!known.includes(wrapper.type)) {
        console.warn('Unknown WebSocket event type:', wrapper.type)
        return
      }
      this.emit(wrapper.type as keyof WebSocketEventPayloadMap, wrapper.data as never)
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
