import { create } from 'zustand'
import type { Conversation, Message, User } from '../types'
import { apiService } from '../services/api'
import { socketService } from '../services/socket'

interface ChatState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  messages: Message[]
  typingUsers: Set<string>
  isLoading: boolean
  error: string | null

  loadConversations: () => Promise<void>
  selectConversation: (conversationId: string) => Promise<void>
  loadMessages: (conversationId: string) => Promise<void>
  sendMessage: (conversationId: string, content: string) => Promise<void>
  createConversation: (type: string, memberIds: string[], name?: string) => Promise<void>
  addMessage: (message: Message) => void
  setTyping: (userId: string, isTyping: boolean) => void
  clearError: () => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set, get) => {
  socketService.on('NEW_MESSAGE', (message: Message) => {
    const { currentConversation, messages } = get()
    if (message.conversationId === currentConversation?.id) {
      set({ messages: [...messages, message] })
    }

    set(state => ({
      conversations: state.conversations.map(conv =>
        conv.id === message.conversationId
          ? { ...conv, lastMessage: message }
          : conv
      )
    }))
  })

  socketService.on('USER_TYPING', ({ userId, conversationId, isTyping }: any) => {
    const { currentConversation, typingUsers } = get()
    if (conversationId === currentConversation?.id) {
      const newTypingUsers = new Set(typingUsers)
      if (isTyping) {
        newTypingUsers.add(userId)
      } else {
        newTypingUsers.delete(userId)
      }
      set({ typingUsers: newTypingUsers })
    }
  })

  return {
    conversations: [],
    currentConversation: null,
    messages: [],
    typingUsers: new Set(),
    isLoading: false,
    error: null,

    loadConversations: async () => {
      set({ isLoading: true, error: null })
      try {
        const response = await apiService.getConversations()
        set({ conversations: response.data || [], isLoading: false })
      } catch (error: any) {
        set({ error: error.response?.data?.error || 'Failed to load conversations', isLoading: false })
      }
    },

    selectConversation: async (conversationId: string) => {
      const { currentConversation } = get()

      if (currentConversation) {
        socketService.leaveConversation(currentConversation.id)
      }

      set({ isLoading: true, error: null })
      try {
        const response = await apiService.getConversation(conversationId)
        const conversation = response.data!

        set({
          currentConversation: conversation,
          messages: conversation.messages || [],
          typingUsers: new Set(),
          isLoading: false
        })

        socketService.joinConversation(conversationId)
      } catch (error: any) {
        set({ error: error.response?.data?.error || 'Failed to load conversation', isLoading: false })
      }
    },

    loadMessages: async (conversationId: string) => {
      set({ isLoading: true, error: null })
      try {
        const response = await apiService.getMessages(conversationId)
        set({ messages: response.data || [], isLoading: false })
      } catch (error: any) {
        set({ error: error.response?.data?.error || 'Failed to load messages', isLoading: false })
      }
    },

    sendMessage: async (conversationId: string, content: string) => {
      try {
        await apiService.sendMessage({
          conversationId,
          content,
          messageType: 'TEXT'
        })
      } catch (error: any) {
        set({ error: error.response?.data?.error || 'Failed to send message' })
        throw error
      }
    },

    createConversation: async (type: string, memberIds: string[], name?: string) => {
      set({ isLoading: true, error: null })
      try {
        const response = await apiService.createConversation({ type, memberIds, name })
        const newConversation = response.data!

        set(state => ({
          conversations: [newConversation, ...state.conversations],
          isLoading: false
        }))

        get().selectConversation(newConversation.id)
      } catch (error: any) {
        set({ error: error.response?.data?.error || 'Failed to create conversation', isLoading: false })
        throw error
      }
    },

    addMessage: (message: Message) => {
      set(state => ({ messages: [...state.messages, message] }))
    },

    setTyping: (userId: string, isTyping: boolean) => {
      const { typingUsers } = get()
      const newTypingUsers = new Set(typingUsers)
      if (isTyping) {
        newTypingUsers.add(userId)
      } else {
        newTypingUsers.delete(userId)
      }
      set({ typingUsers: newTypingUsers })
    },

    clearError: () => set({ error: null }),

    reset: () => {
      const { currentConversation } = get()
      if (currentConversation) {
        socketService.leaveConversation(currentConversation.id)
      }
      set({
        conversations: [],
        currentConversation: null,
        messages: [],
        typingUsers: new Set(),
        isLoading: false,
        error: null,
      })
    },
  }
})
