import { create } from 'zustand'
import type { Conversation, Message, UserSearchResult } from '../types'
import { conversationService } from '../services/conversation.service'
import { messageService } from '../services/message.service'
import { socketService } from '../services/socket'
import { useAuthStore } from './authStore'
import { useChatUIStore } from './chatUIStore'
import toast from 'react-hot-toast'
import { updateConversationInList } from './chat.helpers'
import { registerChatRealtimeListeners } from './chat.realtime'
import type { ChatState } from './chat.types'

let typingTimeoutRef: ReturnType<typeof setTimeout> | null = null

export const useChatStore = create<ChatState>((set, get) => {
  registerChatRealtimeListeners(set, get)

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
        const response = await conversationService.getConversations()
        set({ conversations: response.data?.conversations || [], isLoading: false })
      } catch (error: any) {
        set({
          error: error.response?.data?.error || 'Failed to load conversations',
          isLoading: false,
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
        const [messagesResponse, detailResponse] = await Promise.all([
          messageService.getMessages(conversationId),
          conversationService.getConversation(conversationId).catch(() => null),
        ])
        const detail = detailResponse?.data as Conversation | undefined
        const baseConv = conversations.find((c) => c.id === conversationId)
        const merged: Conversation | null = detail
          ? { ...(baseConv || ({} as Conversation)), ...detail }
          : baseConv || null

        const updates: Partial<Conversation> = { unreadCount: 0 }
        if (detail) {
          updates.otherUser = detail.otherUser
        }

        set({
          currentConversation: merged,
          messages: messagesResponse.data?.messages || [],
          typingUsers: new Map(),
          typingTimeouts: new Map(),
          isLoading: false,
          conversations: updateConversationInList(conversations, conversationId, updates),
        })

        socketService.joinConversation(conversationId)

        if (baseConv?.unreadCount && baseConv.unreadCount > 0) {
          get().markAsRead(conversationId)
        }
      } catch (error: any) {
        set({
          error: error.response?.data?.error || 'Failed to load conversation',
          isLoading: false,
        })
      }
    },

    loadMessages: async (conversationId: string) => {
      set({ isLoading: true, error: null })
      try {
        const response = await messageService.getMessages(conversationId)
        set({ messages: response.data?.messages || [], isLoading: false })
      } catch (error: any) {
        set({
          error: error.response?.data?.error || 'Failed to load messages',
          isLoading: false,
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
        const res = await messageService.sendMessage({
          conversationId,
          content,
          messageType: 'text',
          clientMsgId,
        })
        const serverMsg = res.data
        if (serverMsg) {
          const { messages: latest, currentConversation: cc } = get()
          if (cc?.id === conversationId) {
            const replaced = latest.map((m) =>
              m.clientMsgId && m.clientMsgId === clientMsgId
                ? { ...serverMsg, status: 'sent' }
                : m,
            )
            set({ messages: replaced })
          }
        }
      } catch (error: any) {
        const { messages: latest, currentConversation: cc } = get()
        if (cc?.id === conversationId) {
          set({
            messages: latest.map((m) =>
              m.clientMsgId === clientMsgId ? { ...m, status: 'failed' } : m,
            ),
          })
        }
        set({ error: error.response?.data?.error || 'Failed to send message' })
        throw error
      }
    },

    createGroupConversation: async (name: string, participantIds: string[]) => {
      set({ isLoading: true, error: null })
      try {
        const response = await conversationService.createGroupConversation({ name, participantIds })
        const newConversation = response.data!
        await get().loadConversations()
        set({ isLoading: false })
        get().selectConversation(newConversation.id)
      } catch (error: any) {
        set({
          error: error.response?.data?.error || 'Failed to create conversation',
          isLoading: false,
        })
        throw error
      }
    },

    addMessage: (message: Message) => {
      set((state) => ({ messages: [...state.messages, message] }))
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
        await conversationService.markAsRead(conversationId)

        set((state) => ({
          conversations: updateConversationInList(state.conversations, conversationId, {
            unreadCount: 0,
          }),
        }))
      } catch (error: any) {
        console.error('Failed to mark as read:', error)
      }
    },

    handleConversationClick: (conversationId: string) => {
      useChatUIStore.getState().setTempChatUser(null)
      get().selectConversation(conversationId)
    },

    handleSendMessage: async () => {
      const ui = useChatUIStore.getState()
      const { tempChatUser, messageInput } = ui
      const { currentConversation } = get()

      if (tempChatUser && !currentConversation) {
        await get().handleSendMessageToNewUser()
        return
      }

      if (!messageInput.trim() || !currentConversation) return

      try {
        await get().sendMessage(currentConversation.id, messageInput.trim())
        ui.setMessageInput('')
        await get().handleTyping(false)
      } catch (error) {
        console.error('Failed to send message:', error)
        toast.error('Failed to send message')
      }
    },

    handleInputChange: (value: string) => {
      useChatUIStore.getState().setMessageInput(value)
      get().handleTyping(true)
    },

    handleSelectUser: async (result: UserSearchResult) => {
      const { conversations } = get()
      const ui = useChatUIStore.getState()

      try {
        ui.setTempChatUser(null)
        get().selectConversation(null)

        const response = await conversationService.checkDirectConversation(result.id)
        const convData = response.data

        if (convData && convData.id) {
          const existingConv = conversations.find((c) => c.id === convData.id)

          if (existingConv) {
            get().selectConversation(convData.id)
          } else {
            await get().loadConversations()
            get().selectConversation(convData.id)
          }
        } else {
          ui.setTempChatUser({
            id: result.id,
            username: result.username,
            fullName: result.fullName,
            avatar: result.avatar,
            conversationId: undefined,
          })
        }

        ui.setShowSearch(false)
      } catch (error) {
        console.error('Failed to check conversation:', error)
        get().selectConversation(null)
        ui.setTempChatUser({
          id: result.id,
          username: result.username,
          fullName: result.fullName,
          avatar: result.avatar,
          conversationId: undefined,
        })
        ui.setShowSearch(false)
      }
    },

    handleSendMessageToNewUser: async () => {
      const ui = useChatUIStore.getState()
      const { messageInput, tempChatUser, isCreatingConversation } = ui

      if (!messageInput.trim() || !tempChatUser || isCreatingConversation) return

      try {
        ui.setIsCreatingConversation(true)

        await messageService.sendDirectMessage(tempChatUser.id, messageInput.trim())
        await get().loadConversations()

        const convResponse = await conversationService.checkDirectConversation(tempChatUser.id)
        if (convResponse.data && convResponse.data.id) {
          get().selectConversation(convResponse.data.id)
        }

        ui.setTempChatUser(null)
        ui.setMessageInput('')
        toast.success('Message sent!')
      } catch (error) {
        console.error('Failed to send direct message:', error)
        toast.error('Failed to send message')
      } finally {
        ui.setIsCreatingConversation(false)
      }
    },

    handleTyping: async (typing: boolean) => {
      const { currentConversation } = get()
      const ui = useChatUIStore.getState()
      const { isTyping } = ui

      if (!currentConversation) return

      if (typingTimeoutRef) {
        clearTimeout(typingTimeoutRef)
      }

      if (typing && !isTyping) {
        ui.setIsTyping(true)
        try {
          await conversationService.sendTypingIndicator(currentConversation.id)
        } catch (error) {
          console.error('Failed to send typing indicator:', error)
        }
      }

      if (typing) {
        typingTimeoutRef = setTimeout(() => {
          useChatUIStore.getState().setIsTyping(false)
        }, 3000)
      } else {
        ui.setIsTyping(false)
      }
    },

    initialize: async () => {
      const loadUser = useAuthStore.getState().loadUser
      await Promise.all([get().loadConversations(), loadUser()])
    },

    clearError: () => set({ error: null }),

    reset: () => {
      const { currentConversation, typingTimeouts } = get()

      if (currentConversation) {
        socketService.leaveConversation(currentConversation.id)
      }

      typingTimeouts.forEach((timeout) => clearTimeout(timeout))

      set({
        conversations: [],
        currentConversation: null,
        messages: [],
        typingUsers: new Map(),
        typingTimeouts: new Map(),
        isLoading: false,
        error: null,
      })

      useChatUIStore.getState().reset()
    },
  }
})
