import { create } from 'zustand'
import type {
  Conversation,
  Message,
  MessageCreatedEventData,
  MessageUpdatedEventData,
  MessageDeletedEventData,
  UserTypingData,
  ConversationCreatedData,
  ConversationUpdatedData,
  ConversationDeletedData
} from '../types'
import { WebSocketEventType } from '../types'
import { apiService } from '../services/api'
import { socketService } from '../services/socket'
import { useAuthStore } from './authStore'

interface TypingUserInfo {
  userId: string
  username: string
}

interface ChatState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  messages: Message[]
  typingUsers: Map<string, TypingUserInfo>
  typingTimeouts: Map<string, ReturnType<typeof setTimeout>>
  isLoading: boolean
  error: string | null

  loadConversations: () => Promise<void>
  selectConversation: (conversationId: string | null) => Promise<void>
  loadMessages: (conversationId: string) => Promise<void>
  sendMessage: (conversationId: string, content: string) => Promise<void>
  createConversation: (type: string, memberIds: string[], name?: string) => Promise<void>
  addMessage: (message: Message) => void
  setTyping: (userId: string, isTyping: boolean, username?: string) => void
  markAsRead: (conversationId: string) => Promise<void>
  clearError: () => void
  reset: () => void
}



const moveConversationToTop = (conversations: Conversation[], conversationId: string): Conversation[] => {
  const targetIndex = conversations.findIndex(c => c.id === conversationId)
  if (targetIndex > 0) {
    const [targetConv] = conversations.splice(targetIndex, 1)
    return [targetConv, ...conversations]
  }
  return conversations
}

const updateConversationInList = (
  conversations: Conversation[],
  conversationId: string,
  updates: Partial<Conversation>
): Conversation[] => {
  return conversations.map(conv => 
    conv.id === conversationId ? { ...conv, ...updates } : conv
  )
}

export const useChatStore = create<ChatState>((set, get) => {
  

  

  socketService.on(WebSocketEventType.NEW_MESSAGE, (eventData: MessageCreatedEventData) => {
    const { currentConversation, messages, conversations } = get()
    const { conversation, message } = eventData
    const currentUser = useAuthStore.getState().user
    

    if (message.conversationId === currentConversation?.id && message.senderId !== currentUser?.id) {
      const messageExists = messages.some(m => m.id === message.id)
      if (!messageExists) {
        set({ messages: [...messages, message] })
      }
    }
    

    const isCurrentConv = currentConversation?.id === message.conversationId
    const updates: Partial<Conversation> = {
      lastMessageText: message.content,
      lastMessageAt: message.createdAt,
      participantCount: conversation.participantCount,
    }
    

    if (!isCurrentConv && message.senderId !== currentUser?.id) {
      const conv = conversations.find(c => c.id === message.conversationId)
      updates.unreadCount = (conv?.unreadCount || 0) + 1
    }
    
    set({
      conversations: moveConversationToTop(
        updateConversationInList(conversations, message.conversationId, updates),
        message.conversationId
      )
    })
  })


  socketService.on(WebSocketEventType.MESSAGE_UPDATED, (eventData: MessageUpdatedEventData) => {
    const { currentConversation, messages, conversations } = get()
    const { conversation, message } = eventData
    

    if (message.conversationId === currentConversation?.id) {
      set({
        messages: messages.map(msg =>
          msg.id === message.id ? message : msg
        )
      })
    }
    

    set({
      conversations: moveConversationToTop(
        updateConversationInList(conversations, message.conversationId, {
          lastMessageText: message.content,
          lastMessageAt: message.updatedAt,
          participantCount: conversation.participantCount,
        }),
        message.conversationId
      )
    })
  })


  socketService.on(WebSocketEventType.MESSAGE_DELETED, (eventData: MessageDeletedEventData) => {
    const { currentConversation, messages } = get()
    
    if (eventData.conversation.id === currentConversation?.id) {
      set({ messages: messages.filter(msg => msg.id !== eventData.messageId) })
    }
  })


  socketService.on(WebSocketEventType.CONVERSATION_CREATED, (data: ConversationCreatedData) => {
    const { conversations } = get()
    
    if (!conversations.find(c => c.id === data.id)) {
      set({ conversations: [data, ...conversations] })
      console.log('✅ New conversation created:', data.id)
    }
  })
  

  socketService.on(WebSocketEventType.CONVERSATION_UPDATED, (data: ConversationUpdatedData) => {
    const { conversations } = get()
    
    set({
      conversations: updateConversationInList(conversations, data.id, {
        name: data.name,
        avatar: data.avatar,
        participantCount: data.participantCount,
      })
    })
    
    console.log('✅ Conversation updated:', data.id)
  })
  

  socketService.on(WebSocketEventType.CONVERSATION_DELETED, (data: ConversationDeletedData) => {
    const { currentConversation, conversations } = get()
    
    set({ conversations: conversations.filter(conv => conv.id !== data.conversationId) })
    
    if (currentConversation?.id === data.conversationId) {
      set({
        currentConversation: null,
        messages: [],
        typingUsers: new Map(),
        typingTimeouts: new Map()
      })
    }
    
    console.log('✅ Conversation deleted:', data.conversationId)
  })


  socketService.on(WebSocketEventType.USER_TYPING, (data: UserTypingData) => {
    const { currentConversation, typingUsers, typingTimeouts } = get()
    const currentUser = useAuthStore.getState().user
    
    if (data.userId === currentUser?.id || data.conversationId !== currentConversation?.id) {
      return
    }
    
    const newTypingUsers = new Map(typingUsers)
    const newTypingTimeouts = new Map(typingTimeouts)
    

    if (newTypingTimeouts.has(data.userId)) {
      clearTimeout(newTypingTimeouts.get(data.userId)!)
    }
    

    newTypingUsers.set(data.userId, { userId: data.userId, username: data.username })
    

    const timeout = setTimeout(() => {
      const { typingUsers: current, typingTimeouts: timeouts } = get()
      const updated = new Map(current)
      const updatedTimeouts = new Map(timeouts)
      updated.delete(data.userId)
      updatedTimeouts.delete(data.userId)
      set({ typingUsers: updated, typingTimeouts: updatedTimeouts })
    }, 3000)
    
    newTypingTimeouts.set(data.userId, timeout)
    set({ typingUsers: newTypingUsers, typingTimeouts: newTypingTimeouts })
  })
  

  socketService.on(WebSocketEventType.USER_STOP_TYPING, (data: UserTypingData) => {
    const { typingUsers, typingTimeouts } = get()
    const currentUser = useAuthStore.getState().user
    
    if (data.userId === currentUser?.id) return
    
    const newTypingUsers = new Map(typingUsers)
    const newTypingTimeouts = new Map(typingTimeouts)
    
    newTypingUsers.delete(data.userId)
    
    if (newTypingTimeouts.has(data.userId)) {
      clearTimeout(newTypingTimeouts.get(data.userId)!)
      newTypingTimeouts.delete(data.userId)
    }
    
    set({ typingUsers: newTypingUsers, typingTimeouts: newTypingTimeouts })
  })
  

  socketService.on(WebSocketEventType.USER_ONLINE, (data: { userId: string; status: string }) => {
    console.log('User online:', data.userId)

  })
  
  socketService.on(WebSocketEventType.USER_OFFLINE, (data: { userId: string; status: string }) => {
    console.log('User offline:', data.userId)

  })

  return {
    conversations: [],
    currentConversation: null,
    messages: [],
    typingUsers: new Map(),
    typingTimeouts: new Map(),
    isLoading: false,
    error: null,

    loadConversations: async () => {
      set({ isLoading: true, error: null })
      try {
        const response = await apiService.getConversations()
        set({ conversations: response.data?.conversations || [], isLoading: false })
      } catch (error: any) {
        set({ 
          error: error.response?.data?.error || 'Failed to load conversations', 
          isLoading: false 
        })
      }
    },

    selectConversation: async (conversationId: string | null) => {
      const { currentConversation, conversations } = get()


      if (currentConversation) {
        socketService.leaveConversation(currentConversation.id)
      }


      if (!conversationId) {
        set({
          currentConversation: null,
          messages: [],
          typingUsers: new Map(),
          typingTimeouts: new Map(),
        })
        return
      }

      set({ isLoading: true, error: null })
      try {
        const messagesResponse = await apiService.getMessages(conversationId)
        const conv = conversations.find(c => c.id === conversationId)
        

        set({
          currentConversation: conv || null,
          messages: messagesResponse.data?.messages || [],
          typingUsers: new Map(),
          typingTimeouts: new Map(),
          isLoading: false,
          conversations: updateConversationInList(conversations, conversationId, { unreadCount: 0 })
        })

        socketService.joinConversation(conversationId)


        if (conv?.unreadCount && conv.unreadCount > 0) {
          get().markAsRead(conversationId)
        }
      } catch (error: any) {
        set({ 
          error: error.response?.data?.error || 'Failed to load conversation', 
          isLoading: false 
        })
      }
    },

    loadMessages: async (conversationId: string) => {
      set({ isLoading: true, error: null })
      try {
        const response = await apiService.getMessages(conversationId)
        set({ messages: response.data?.messages || [], isLoading: false })
      } catch (error: any) {
        set({ 
          error: error.response?.data?.error || 'Failed to load messages', 
          isLoading: false 
        })
      }
    },

    sendMessage: async (conversationId: string, content: string) => {
      try {
        const response = await apiService.sendMessage({
          conversationId,
          content,
          messageType: 'TEXT'
        })
        
        if (!response.data) return
        
        const { currentConversation, messages, conversations } = get()
        

        if (response.data.conversationId === currentConversation?.id) {
          set({ messages: [...messages, response.data] })
        }
        
    
        set({
          conversations: moveConversationToTop(
            updateConversationInList(conversations, response.data.conversationId, {
              lastMessageText: response.data.content,
              lastMessageAt: response.data.createdAt
            }),
            response.data.conversationId
          )
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
        set({ 
          error: error.response?.data?.error || 'Failed to create conversation', 
          isLoading: false 
        })
        throw error
      }
    },

    addMessage: (message: Message) => {
      set(state => ({ messages: [...state.messages, message] }))
    },

    setTyping: (userId: string, isTyping: boolean, username?: string) => {
      const { typingUsers } = get()
      const newTypingUsers = new Map(typingUsers)
      
      if (isTyping && username) {
        newTypingUsers.set(userId, { userId, username })
      } else {
        newTypingUsers.delete(userId)
      }
      
      set({ typingUsers: newTypingUsers })
    },

    markAsRead: async (conversationId: string) => {
      try {
        await apiService.markConversationAsRead(conversationId)
        
        set(state => ({
          conversations: updateConversationInList(state.conversations, conversationId, { 
            unreadCount: 0 
          })
        }))
      } catch (error: any) {
        console.error('Failed to mark as read:', error)
      }
    },

    clearError: () => set({ error: null }),

    reset: () => {
      const { currentConversation, typingTimeouts } = get()
      
      if (currentConversation) {
        socketService.leaveConversation(currentConversation.id)
      }
      
      typingTimeouts.forEach(timeout => clearTimeout(timeout))
      
      set({
        conversations: [],
        currentConversation: null,
        messages: [],
        typingUsers: new Map(),
        typingTimeouts: new Map(),
        isLoading: false,
        error: null,
      })
    },
  }
})
