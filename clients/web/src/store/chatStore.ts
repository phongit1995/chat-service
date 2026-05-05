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
import toast from 'react-hot-toast'

interface TypingUserInfo {
  userId: string
  username: string
}

interface TempChatUser {
  id: string
  username: string
  fullName?: string
  avatar?: string
  conversationId?: string
}

interface ChatState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  messages: Message[]
  typingUsers: Map<string, TypingUserInfo>
  typingTimeouts: Map<string, ReturnType<typeof setTimeout>>
  isLoading: boolean
  error: string | null
  messageInput: string
  isTyping: boolean
  showSearch: boolean
  tempChatUser: TempChatUser | null
  isCreatingConversation: boolean
  showProfileEdit: boolean

  loadConversations: () => Promise<void>
  selectConversation: (conversationId: string | null) => Promise<void>
  loadMessages: (conversationId: string) => Promise<void>
  sendMessage: (conversationId: string, content: string) => Promise<void>
  createGroupConversation: (name: string, participantIds: string[]) => Promise<void>
  addMessage: (message: Message) => void
  setTyping: (userId: string, isTyping: boolean, username?: string) => void
  markAsRead: (conversationId: string) => Promise<void>
  setMessageInput: (input: string) => void
  setIsTyping: (typing: boolean) => void
  setShowSearch: (show: boolean) => void
  setTempChatUser: (user: TempChatUser | null) => void
  setIsCreatingConversation: (creating: boolean) => void
  setShowProfileEdit: (show: boolean) => void
  handleConversationClick: (conversationId: string) => void
  handleSendMessage: () => Promise<void>
  handleInputChange: (value: string) => void
  handleSelectUser: (result: any) => Promise<void>
  handleSendMessageToNewUser: () => Promise<void>
  handleTyping: (typing: boolean) => Promise<void>
  initialize: () => Promise<void>
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

let typingTimeoutRef: ReturnType<typeof setTimeout> | null = null

export const useChatStore = create<ChatState>((set, get) => {
  

  

  socketService.on(WebSocketEventType.NEW_MESSAGE, (eventData: MessageCreatedEventData) => {
    const { currentConversation, messages, conversations } = get()
    const { conversation, message } = eventData
    const currentUser = useAuthStore.getState().user

    if (message.conversationId === currentConversation?.id) {
      const idx = messages.findIndex(m =>
        m.id === message.id || (message.clientMsgId && m.clientMsgId === message.clientMsgId)
      )
      if (idx >= 0) {
        const updated = [...messages]
        updated[idx] = { ...message, status: 'sent' }
        set({ messages: updated })
      } else {
        set({ messages: [...messages, message] })
      }
    }

    const existingConv = conversations.find(c => c.id === message.conversationId)
    if (!existingConv) {
      console.log('✅ NEW_MESSAGE for unknown conversation, refetching list:', message.conversationId)
      get().loadConversations()
      return
    }

    const isCurrentConv = currentConversation?.id === message.conversationId
    const updates: Partial<Conversation> = {
      lastMessageText: message.content,
      lastMessageAt: message.createdAt,
      participantCount: conversation.participantCount,
    }
    if (!isCurrentConv && message.senderId !== currentUser?.id) {
      updates.unreadCount = (existingConv.unreadCount || 0) + 1
    } else if (isCurrentConv) {
      updates.unreadCount = 0
    }

    set({
      conversations: moveConversationToTop(
        updateConversationInList(conversations, message.conversationId, updates),
        message.conversationId
      )
    })

    if (isCurrentConv && message.senderId !== currentUser?.id) {
      apiService.markConversationAsRead(message.conversationId).catch(() => {})
    }
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
    console.log('✅ CONVERSATION_CREATED received, refetching list:', data.id)
    get().loadConversations()
  })
  

  socketService.on(WebSocketEventType.CONVERSATION_UPDATED, (data: ConversationUpdatedData) => {
    console.log('✅ CONVERSATION_UPDATED received, refetching list:', data.id)
    get().loadConversations()
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
    messageInput: '',
    isTyping: false,
    showSearch: false,
    tempChatUser: null,
    isCreatingConversation: false,
    showProfileEdit: false,

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
      const clientMsgId = crypto.randomUUID()
      const currentUser = useAuthStore.getState().user
      const now = new Date().toISOString()
      const optimistic: Message = {
        id: clientMsgId,
        conversationId,
        senderId: currentUser?.id || '',
        senderName: currentUser?.fullName || currentUser?.username,
        senderAvatar: currentUser?.avatarURL || currentUser?.avatar,
        content,
        type: 'text',
        status: 'sending',
        createdAt: now,
        updatedAt: now,
        clientMsgId,
      }
      const { currentConversation, messages } = get()
      if (currentConversation?.id === conversationId) {
        set({ messages: [...messages, optimistic] })
      }

      try {
        const res = await apiService.sendMessage({
          conversationId,
          content,
          messageType: 'text',
          clientMsgId,
        })
        const serverMsg = res.data
        if (serverMsg) {
          const { messages: latest, currentConversation: cc } = get()
          if (cc?.id === conversationId) {
            const replaced = latest.map(m =>
              (m.clientMsgId && m.clientMsgId === clientMsgId)
                ? { ...serverMsg, status: 'sent' }
                : m
            )
            set({ messages: replaced })
          }
        }
      } catch (error: any) {
        const { messages: latest, currentConversation: cc } = get()
        if (cc?.id === conversationId) {
          set({
            messages: latest.map(m =>
              m.clientMsgId === clientMsgId ? { ...m, status: 'failed' } : m
            )
          })
        }
        set({ error: error.response?.data?.error || 'Failed to send message' })
        throw error
      }
    },

    createGroupConversation: async (name: string, participantIds: string[]) => {
      set({ isLoading: true, error: null })
      try {
        const response = await apiService.createGroupConversation({ name, participantIds })
        const newConversation = response.data!
        await get().loadConversations()
        set({ isLoading: false })
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

    setMessageInput: (input: string) => set({ messageInput: input }),

    setIsTyping: (typing: boolean) => set({ isTyping: typing }),

    setShowSearch: (show: boolean) => set({ showSearch: show }),

    setTempChatUser: (user: TempChatUser | null) => set({ tempChatUser: user }),

    setIsCreatingConversation: (creating: boolean) => set({ isCreatingConversation: creating }),

    setShowProfileEdit: (show: boolean) => set({ showProfileEdit: show }),

    handleConversationClick: (conversationId: string) => {
      set({ tempChatUser: null })
      get().selectConversation(conversationId)
    },

    handleSendMessage: async () => {
      const { tempChatUser, currentConversation, messageInput } = get()
      
      if (tempChatUser && !currentConversation) {
        await get().handleSendMessageToNewUser()
        return
      }
      
      if (!messageInput.trim() || !currentConversation) return

      try {
        await get().sendMessage(currentConversation.id, messageInput.trim())
        set({ messageInput: '' })
        await get().handleTyping(false)
      } catch (error) {
        console.error('Failed to send message:', error)
        toast.error('Failed to send message')
      }
    },

    handleInputChange: (value: string) => {
      set({ messageInput: value })
      get().handleTyping(true)
    },

    handleSelectUser: async (result: any) => {
      const { conversations } = get()
      
      try {
        set({ tempChatUser: null })
        get().selectConversation(null)
        
        const response = await apiService.checkDirectConversation(result.id)
        const convData = response.data

        if (convData && convData.id) {
          const existingConv = conversations.find(c => c.id === convData.id)
          
          if (existingConv) {
            get().selectConversation(convData.id)
          } else {
            await get().loadConversations()
            get().selectConversation(convData.id)
          }
        } else {
          set({
            tempChatUser: {
              id: result.id,
              username: result.username,
              fullName: result.fullName,
              avatar: result.avatar,
              conversationId: undefined
            }
          })
        }
        
        set({ showSearch: false })
      } catch (error) {
        console.error('Failed to check conversation:', error)
        get().selectConversation(null)
        set({
          tempChatUser: {
            id: result.id,
            username: result.username,
            fullName: result.fullName,
            avatar: result.avatar,
            conversationId: undefined
          },
          showSearch: false
        })
      }
    },

    handleSendMessageToNewUser: async () => {
      const { messageInput, tempChatUser, isCreatingConversation } = get()
      
      if (!messageInput.trim() || !tempChatUser || isCreatingConversation) return

      try {
        set({ isCreatingConversation: true })
        
        await apiService.sendDirectMessage(tempChatUser.id, messageInput.trim())
        await get().loadConversations()
        
        const convResponse = await apiService.checkDirectConversation(tempChatUser.id)
        if (convResponse.data && convResponse.data.id) {
          get().selectConversation(convResponse.data.id)
        }
        
        set({ tempChatUser: null, messageInput: '' })
        toast.success('Message sent!')
      } catch (error) {
        console.error('Failed to send direct message:', error)
        toast.error('Failed to send message')
      } finally {
        set({ isCreatingConversation: false })
      }
    },

    handleTyping: async (typing: boolean) => {
      const { currentConversation, isTyping } = get()
      
      if (!currentConversation) return

      if (typingTimeoutRef) {
        clearTimeout(typingTimeoutRef)
      }

      if (typing && !isTyping) {
        set({ isTyping: true })
        try {
          await apiService.sendTypingIndicator(currentConversation.id)
        } catch (error) {
          console.error('Failed to send typing indicator:', error)
        }
      }

      if (typing) {
        typingTimeoutRef = setTimeout(() => {
          set({ isTyping: false })
        }, 3000)
      } else {
        set({ isTyping: false })
      }
    },

    initialize: async () => {
      const loadUser = useAuthStore.getState().loadUser
      await Promise.all([
        get().loadConversations(),
        loadUser()
      ])
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
        messageInput: '',
        isTyping: false,
        showSearch: false,
        tempChatUser: null,
        isCreatingConversation: false,
        showProfileEdit: false,
      })
    },
  }
})
