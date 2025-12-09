import { create } from 'zustand'
import type { 
  Conversation, 
  Message, 
  User, 
  MessageDeletedData, 
  UserTypingData, 
  ConversationCreatedData 
} from '../types'
import { WebSocketEventType } from '../types'
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
  socketService.on(WebSocketEventType.MESSAGE_CREATED, (message: Message) => {
    const { currentConversation, messages } = get()
    if (message.conversationId === currentConversation?.id) {
      set({ messages: [...messages, message] })
    }

    set(state => ({
      conversations: state.conversations.map(conv =>
        conv.id === message.conversationId
          ? { 
              ...conv, 
              lastMessageText: message.content,
              lastMessageAt: message.createdAt
            }
          : conv
      )
    }))
  })

  socketService.on(WebSocketEventType.MESSAGE_UPDATED, (message: Message) => {
    const { currentConversation, messages } = get()
    if (message.conversationId === currentConversation?.id) {
      set({
        messages: messages.map(msg =>
          msg.id === message.id ? message : msg
        )
      })
    }

    set(state => ({
      conversations: state.conversations.map(conv =>
        conv.id === message.conversationId
          ? { 
              ...conv, 
              lastMessageText: message.content,
              lastMessageAt: message.updatedAt
            }
          : conv
      )
    }))
  })

  socketService.on(WebSocketEventType.MESSAGE_DELETED, (data: MessageDeletedData) => {
    const { currentConversation, messages } = get()
    if (data.conversationId === currentConversation?.id) {
      set({
        messages: messages.filter(msg => msg.id !== data.messageId)
      })
    }
  })

  socketService.on(WebSocketEventType.CONVERSATION_CREATED, (data: ConversationCreatedData) => {
    const { conversations } = get()
    
    const existingConv = conversations.find(c => c.id === data.conversation.id)
    if (!existingConv) {
      set({
        conversations: [data.conversation, ...conversations]
      })
    }
  })

  socketService.on(WebSocketEventType.USER_TYPING, (data: UserTypingData) => {
    const { currentConversation, typingUsers } = get()
    if (data.conversationId === currentConversation?.id) {
      const newTypingUsers = new Set(typingUsers)
      if (data.isTyping) {
        newTypingUsers.add(data.userId)
      } else {
        newTypingUsers.delete(data.userId)
      }
      set({ typingUsers: newTypingUsers })
    }
  })

  socketService.on(WebSocketEventType.USER_STATUS_CHANGED, (data: { userId: string; status: string }) => {
    console.log('User status changed:', data)
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
        const conversations = response.data?.conversations || []
        set({ conversations, isLoading: false })
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
        const messagesResponse = await apiService.getMessages(conversationId)
        const messages = messagesResponse.data?.messages || []

        const conv = get().conversations.find(c => c.id === conversationId)
        
        set({
          currentConversation: conv || null,
          messages,
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
        set({ messages: response.data?.messages || [], isLoading: false })
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
