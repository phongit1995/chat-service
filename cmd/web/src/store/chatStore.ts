import { create } from 'zustand'
import type {
  Conversation,
  Message,
  User,
  MessageCreatedEventData,
  MessageUpdatedEventData,
  MessageDeletedEventData,
  UserTypingData,
  ConversationCreatedData
} from '../types'
import { WebSocketEventType } from '../types'
import { apiService } from '../services/api'
import { socketService } from '../services/socket'
import { useAuthStore } from './authStore'

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
  socketService.on(WebSocketEventType.MESSAGE_CREATED, (eventData: MessageCreatedEventData) => {
    const { currentConversation, messages } = get()
    const { conversation, message } = eventData
    const currentUser = useAuthStore.getState().user

    // ✅ Fix: Use correct field name from backend (ConversationID with capital C)
    const messageConvId = (message as any).ConversationID || message.conversationId
    const messageSenderId = (message as any).SenderID || message.senderId
    
    // ✅ IMPORTANT: Only add message to UI if NOT sent by current user
    // (Current user already has message from API response - optimistic update)
    if (messageConvId === currentConversation?.id && messageSenderId !== currentUser?.id) {
      const messageExists = messages.some(m => m.id === message.id || m.id === (message as any).ID)
      if (!messageExists) {
        // ✅ Normalize message object before adding
        const normalizedMessage: Message = {
          id: (message as any).ID || message.id,
          conversationId: messageConvId,
          senderId: messageSenderId,
          senderName: (message as any).SenderName || message.senderName,
          senderAvatar: (message as any).SenderAvatar || message.senderAvatar,
          type: (message as any).Type || message.type,
          content: (message as any).Content || message.content,
          metadata: (message as any).Metadata || message.metadata,
          status: (message as any).Status || message.status,
          createdAt: (message as any).CreatedAt || message.createdAt,
          updatedAt: (message as any).UpdatedAt || message.updatedAt,
          replyToId: (message as any).ReplyToID || message.replyToId,
        }
        set({ messages: [...messages, normalizedMessage] })
      }
    }

    // ✅ Update conversation and move to top of list
    set(state => {
      const updatedConversations = state.conversations.map(conv =>
        conv.id === messageConvId
          ? {
              ...conv,
              lastMessageText: message.content || (message as any).Content,
              lastMessageAt: message.createdAt || (message as any).CreatedAt,
              participantCount: conversation.participantCount || (conversation as any).ParticipantCount
            }
          : conv
      )
      
      // Move updated conversation to top
      const targetIndex = updatedConversations.findIndex(c => c.id === messageConvId)
      if (targetIndex > 0) {
        const [targetConv] = updatedConversations.splice(targetIndex, 1)
        updatedConversations.unshift(targetConv)
      }
      
      return { conversations: updatedConversations }
    })
  })

  // ✅ Handle NEW_MESSAGE event (same as MESSAGE_CREATED)
  socketService.on(WebSocketEventType.NEW_MESSAGE, (eventData: MessageCreatedEventData) => {
    const { currentConversation, messages } = get()
    const { conversation, message } = eventData
    const currentUser = useAuthStore.getState().user

    // ✅ Fix: Use correct field name from backend (ConversationID with capital C)
    const messageConvId = (message as any).ConversationID || message.conversationId
    const messageSenderId = (message as any).SenderID || message.senderId
    
    // ✅ IMPORTANT: Only add message to UI if NOT sent by current user
    // (Current user already has message from API response - optimistic update)
    if (messageConvId === currentConversation?.id && messageSenderId !== currentUser?.id) {
      const messageExists = messages.some(m => m.id === message.id || m.id === (message as any).ID)
      if (!messageExists) {
        // ✅ Normalize message object before adding
        const normalizedMessage: Message = {
          id: (message as any).ID || message.id,
          conversationId: messageConvId,
          senderId: messageSenderId,
          senderName: (message as any).SenderName || message.senderName,
          senderAvatar: (message as any).SenderAvatar || message.senderAvatar,
          type: (message as any).Type || message.type,
          content: (message as any).Content || message.content,
          metadata: (message as any).Metadata || message.metadata,
          status: (message as any).Status || message.status,
          createdAt: (message as any).CreatedAt || message.createdAt,
          updatedAt: (message as any).UpdatedAt || message.updatedAt,
          replyToId: (message as any).ReplyToID || message.replyToId,
        }
        set({ messages: [...messages, normalizedMessage] })
      }
    }

    // ✅ Update conversation and move to top of list
    set(state => {
      const updatedConversations = state.conversations.map(conv =>
        conv.id === messageConvId
          ? {
              ...conv,
              lastMessageText: message.content || (message as any).Content,
              lastMessageAt: message.createdAt || (message as any).CreatedAt,
              participantCount: conversation.participantCount || (conversation as any).ParticipantCount
            }
          : conv
      )
      
      // Move updated conversation to top
      const targetIndex = updatedConversations.findIndex(c => c.id === messageConvId)
      if (targetIndex > 0) {
        const [targetConv] = updatedConversations.splice(targetIndex, 1)
        updatedConversations.unshift(targetConv)
      }
      
      return { conversations: updatedConversations }
    })
  })

  socketService.on(WebSocketEventType.MESSAGE_UPDATED, (eventData: MessageUpdatedEventData) => {
    const { currentConversation, messages } = get()
    const { conversation, message } = eventData

    // ✅ Fix: Use correct field name from backend
    const messageConvId = (message as any).ConversationID || message.conversationId
    
    if (messageConvId === currentConversation?.id) {
      // ✅ Normalize message object
      const normalizedMessage: Message = {
        id: message.id,
        conversationId: messageConvId,
        senderId: (message as any).SenderID || message.senderId,
        senderName: (message as any).SenderName || message.senderName,
        senderAvatar: (message as any).SenderAvatar || message.senderAvatar,
        type: (message as any).Type || message.type,
        content: (message as any).Content || message.content,
        metadata: (message as any).Metadata || message.metadata,
        status: (message as any).Status || message.status,
        createdAt: (message as any).CreatedAt || message.createdAt,
        updatedAt: (message as any).UpdatedAt || message.updatedAt,
        replyToId: (message as any).ReplyToID || message.replyToId,
      }
      
      set({
        messages: messages.map(msg =>
          msg.id === message.id ? normalizedMessage : msg
        )
      })
    }

    // ✅ Update conversation and move to top of list
    set(state => {
      const updatedConversations = state.conversations.map(conv =>
        conv.id === messageConvId
          ? {
              ...conv,
              lastMessageText: (message as any).Content || message.content,
              lastMessageAt: (message as any).UpdatedAt || message.updatedAt,
              participantCount: (conversation as any).ParticipantCount || conversation.participantCount
            }
          : conv
      )
      
      // Move updated conversation to top
      const targetIndex = updatedConversations.findIndex(c => c.id === messageConvId)
      if (targetIndex > 0) {
        const [targetConv] = updatedConversations.splice(targetIndex, 1)
        updatedConversations.unshift(targetConv)
      }
      
      return { conversations: updatedConversations }
    })
  })

  socketService.on(WebSocketEventType.MESSAGE_DELETED, (eventData: MessageDeletedEventData) => {
    const { currentConversation, messages } = get()
    const { conversation, messageId } = eventData

    // ✅ Fix: Use correct field name from backend
    const convId = (conversation as any).ID || conversation.id
    
    if (convId === currentConversation?.id) {
      set({
        messages: messages.filter(msg => msg.id !== messageId)
      })
    }
  })

  socketService.on(WebSocketEventType.CONVERSATION_CREATED, (data: ConversationCreatedData) => {
    const { conversations } = get()
    
    // ✅ Fix: Use correct field name from backend
    const convId = (data as any).ID || data.id
    
    const existingConv = conversations.find(c => c.id === convId)
    if (!existingConv) {
      // ✅ Normalize conversation object (no createdAt/updatedAt in Conversation type)
      const normalizedConv: Conversation = {
        id: convId,
        type: (data as any).Type || data.type,
        name: (data as any).Name || data.name,
        avatar: (data as any).Avatar || data.avatar,
        participantCount: (data as any).ParticipantCount || data.participantCount,
        lastMessageText: (data as any).LastMessageText || data.lastMessageText || '',
        lastMessageAt: (data as any).LastMessageAt || data.lastMessageAt || '',
        unreadCount: (data as any).UnreadCount || data.unreadCount || 0,
      }
      
      set({
        conversations: [normalizedConv, ...conversations]
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
        const response = await apiService.sendMessage({
          conversationId,
          content,
          messageType: 'TEXT'
        })
        
        // ✅ OPTIMISTIC UPDATE: Add message to UI immediately
        if (response.data) {
          const { currentConversation, messages } = get()
          if (response.data.conversationId === currentConversation?.id) {
            set({ messages: [...messages, response.data] })
          }
          
          // ✅ UPDATE CONVERSATION LIST: Update last message preview and move to top
          set(state => {
            const updatedConversations = state.conversations.map(conv =>
              conv.id === response.data!.conversationId
                ? {
                    ...conv,
                    lastMessageText: response.data!.content,
                    lastMessageAt: response.data!.createdAt
                  }
                : conv
            )
            
            // Move updated conversation to top
            const targetIndex = updatedConversations.findIndex(c => c.id === response.data!.conversationId)
            if (targetIndex > 0) {
              const [targetConv] = updatedConversations.splice(targetIndex, 1)
              updatedConversations.unshift(targetConv)
            }
            
            return { conversations: updatedConversations }
          })
        }
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
