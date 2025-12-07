import { io, Socket } from 'socket.io-client'
import type { Message } from '../types'
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

    this.socket.on('NEW_MESSAGE', (message: Message) => {
      this.emit('NEW_MESSAGE', message)
    })

    this.socket.on('MESSAGE_DELETED', (data: { messageId: string; conversationId: string }) => {
      this.emit('MESSAGE_DELETED', data)
    })

    this.socket.on('MESSAGE_UPDATED', (message: Message) => {
      this.emit('MESSAGE_UPDATED', message)
    })

    this.socket.on('USER_TYPING', (data: { userId: string; conversationId: string; isTyping: boolean }) => {
      this.emit('USER_TYPING', data)
    })

    this.socket.on('USER_ONLINE', (data: { userId: string }) => {
      this.emit('USER_ONLINE', data)
    })

    this.socket.on('USER_OFFLINE', (data: { userId: string }) => {
      this.emit('USER_OFFLINE', data)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.listeners.clear()
    }
  }

  joinConversation(conversationId: string) {
    this.socket?.emit('JOIN_CONVERSATION', { conversationId })
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit('LEAVE_CONVERSATION', { conversationId })
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
