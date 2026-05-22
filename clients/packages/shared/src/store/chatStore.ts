import { create } from 'zustand'
import type { Conversation, Message, UserSearchResult } from '../types'
import { conversationService } from '../services/conversation.service'
import { messageService } from '../services/message.service'
import { compressImage } from '../services/imageCompress'
import { socketService } from '../services/socket'
import { sendWithOptimistic, readImageDimensions } from './optimisticSend'
import { useAuthStore } from './authStore'
import { useChatUIStore } from './chatUIStore'
import toast from 'react-hot-toast'
import { updateConversationInList } from './chat.helpers'
import { registerChatRealtimeListeners } from './chat.realtime'
import type { ChatState } from './chat.types'

let typingTimeoutRef: ReturnType<typeof setTimeout> | null = null

const MESSAGE_PAGE_SIZE = 50

export const useChatStore = create<ChatState>((set, get) => {
  registerChatRealtimeListeners(set, get)

  return {
    conversations: [],
    currentConversation: null,
    messages: [],
    hasMoreMessages: false,
    isLoadingMoreMessages: false,
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
          hasMoreMessages: false,
          isLoadingMoreMessages: false,
          typingUsers: new Map(),
          typingTimeouts: new Map(),
        })
        return
      }

      set({ isLoading: true, error: null, hasMoreMessages: false, isLoadingMoreMessages: false })
      try {
        const [messagesResponse, detailResponse] = await Promise.all([
          messageService.getMessages(conversationId, MESSAGE_PAGE_SIZE),
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

        const loadedMessages = messagesResponse.data?.messages || []
        set({
          currentConversation: merged,
          messages: loadedMessages,
          hasMoreMessages: loadedMessages.length >= MESSAGE_PAGE_SIZE,
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
        const response = await messageService.getMessages(conversationId, MESSAGE_PAGE_SIZE)
        const loaded = response.data?.messages || []
        set({
          messages: loaded,
          hasMoreMessages: loaded.length >= MESSAGE_PAGE_SIZE,
          isLoading: false,
        })
      } catch (error: any) {
        set({
          error: error.response?.data?.error || 'Failed to load messages',
          isLoading: false,
        })
      }
    },

    loadMoreMessages: async (conversationId: string) => {
      const { messages, hasMoreMessages, isLoadingMoreMessages, currentConversation } = get()
      if (!hasMoreMessages || isLoadingMoreMessages) return
      if (!currentConversation || currentConversation.id !== conversationId) return
      if (messages.length === 0) return

      let oldest = messages[0]
      for (const m of messages) {
        if (new Date(m.createdAt).getTime() < new Date(oldest.createdAt).getTime()) {
          oldest = m
        }
      }

      set({ isLoadingMoreMessages: true })
      try {
        const response = await messageService.getMessages(
          conversationId,
          MESSAGE_PAGE_SIZE,
          oldest.id,
        )
        if (get().currentConversation?.id !== conversationId) return

        const older = response.data?.messages || []
        const existingIds = new Set(get().messages.map((m) => m.id))
        const deduped = older.filter((m) => !existingIds.has(m.id))
        set({
          messages: [...deduped, ...get().messages],
          hasMoreMessages: older.length >= MESSAGE_PAGE_SIZE,
          isLoadingMoreMessages: false,
        })
      } catch (error: any) {
        set({
          isLoadingMoreMessages: false,
          error: error.response?.data?.error || 'Failed to load more messages',
        })
      }
    },

    sendMessage: async (conversationId: string, content: string, replyToId?: string) => {
      await sendWithOptimistic({
        conversationId,
        get,
        set,
        build: (clientMsgId, now, sender) => ({
          id: clientMsgId,
          conversationId,
          ...sender,
          content,
          type: 'text',
          status: 'sending',
          createdAt: now,
          updatedAt: now,
          clientMsgId,
          replyToId,
        }),
        send: (clientMsgId) =>
          messageService.sendMessage({ conversationId, content, messageType: 'text', clientMsgId, replyToId }),
        errorFallback: 'Failed to send message',
        rethrow: true,
      })
    },

    sendImageMessage: async (conversationId: string, file: File) => {
      const localUrl = URL.createObjectURL(file)
      const dims = await readImageDimensions(localUrl)

      await sendWithOptimistic({
        conversationId,
        get,
        set,
        build: (clientMsgId, now, sender) => ({
          id: clientMsgId,
          conversationId,
          ...sender,
          content: '',
          type: 'image',
          status: 'uploading',
          createdAt: now,
          updatedAt: now,
          clientMsgId,
          metadata: JSON.stringify({
            url: localUrl,
            mimeType: file.type || 'image/jpeg',
            size: file.size,
            width: dims.w,
            height: dims.h,
            fileName: file.name,
            _localBlob: true,
          }),
        }),
        send: async (clientMsgId) => {
          const compressed = await compressImage(file)
          return messageService.sendImageMessage(conversationId, compressed.file, clientMsgId)
        },
        cleanup: () => URL.revokeObjectURL(localUrl),
        errorFallback: 'Failed to upload image',
        toastOnError: true,
      })
    },

    editMessage: async (messageId: string, content: string) => {
      const { currentConversation, messages } = get()
      if (!currentConversation) return
      const prev = messages
      const next = messages.map((m) =>
        m.id === messageId ? { ...m, content, updatedAt: new Date().toISOString() } : m,
      )
      set({ messages: next })
      try {
        await messageService.updateMessage(currentConversation.id, messageId, content)
      } catch (e: any) {
        set({ messages: prev })
        toast.error(e?.response?.data?.error || 'Failed to edit message')
        throw e
      }
    },

    deleteMessage: async (messageId: string) => {
      const { currentConversation, messages } = get()
      if (!currentConversation) return
      const prev = messages
      set({ messages: messages.filter((m) => m.id !== messageId) })
      try {
        await messageService.deleteMessage(currentConversation.id, messageId)
      } catch (e: any) {
        set({ messages: prev })
        toast.error(e?.response?.data?.error || 'Failed to delete message')
        throw e
      }
    },

    toggleReaction: async (messageId: string, type: string) => {
      const { messages, currentConversation } = get()
      if (!currentConversation) return
      const me = useAuthStore.getState().user
      const myId = me?.id || ''
      const conversationId = currentConversation.id

      // Optimistic
      const prevMessages = messages
      const optimisticMessages = messages.map((m) => {
        if (m.id !== messageId) return m
        const reactions = { ...(m.reactions || {}) }
        const users = reactions[type] ? [...reactions[type]] : []
        const idx = users.indexOf(myId)
        if (idx >= 0) {
          users.splice(idx, 1)
          if (users.length === 0) delete reactions[type]
          else reactions[type] = users
        } else {
          reactions[type] = [...users, myId]
        }
        return { ...m, reactions }
      })
      set({ messages: optimisticMessages })

      try {
        const res = await messageService.toggleReaction(conversationId, messageId, type)
        const server = res.data
        if (server) {
          const { messages: latest } = get()
          set({
            messages: latest.map((m) =>
              m.id === messageId ? { ...m, reactions: server.reactions || {} } : m,
            ),
          })
        }
      } catch (err: unknown) {
        set({ messages: prevMessages })
        const msg = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
          || (err as { message?: string })?.message
          || 'Failed to toggle reaction'
        toast.error(msg)
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

    hideConversation: async (conversationId: string) => {
      const { conversations, currentConversation } = get()
      const prev = conversations
      set({
        conversations: conversations.filter((c) => c.id !== conversationId),
        ...(currentConversation?.id === conversationId
          ? { currentConversation: null, messages: [] }
          : {}),
      })
      try {
        await conversationService.hide(conversationId)
      } catch (error: any) {
        console.error('Failed to hide conversation:', error)
        set({ conversations: prev })
        toast.error('Failed to hide conversation')
        throw error
      }
    },

    handleConversationClick: (conversationId: string) => {
      useChatUIStore.getState().setTempChatUser(null)
      get().selectConversation(conversationId)
    },

    handleSendMessage: async () => {
      const ui = useChatUIStore.getState()
      const { tempChatUser, messageInput, replyTo, editingMessageId } = ui
      const { currentConversation } = get()

      if (tempChatUser && !currentConversation) {
        await get().handleSendMessageToNewUser()
        return
      }

      if (!messageInput.trim() || !currentConversation) return

      try {
        if (editingMessageId) {
          await get().editMessage(editingMessageId, messageInput.trim())
          ui.setEditingMessageId(null)
        } else {
          await get().sendMessage(currentConversation.id, messageInput.trim(), replyTo?.id)
          if (replyTo) ui.setReplyTo(null)
        }
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
      await get().loadConversations()
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
        hasMoreMessages: false,
        isLoadingMoreMessages: false,
        typingUsers: new Map(),
        typingTimeouts: new Map(),
        isLoading: false,
        error: null,
      })

      useChatUIStore.getState().reset()
    },
  }
})
