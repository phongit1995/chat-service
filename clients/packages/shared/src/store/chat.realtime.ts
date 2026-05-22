import type { StoreApi } from 'zustand'
import { MessageType } from '../types'
import type {
  ConversationCreatedData,
  ConversationDeletedData,
  ConversationUpdatedData,
  MessageCreatedEventData,
  MessageDeletedEventData,
  MessageReactionUpdatedEventData,
  MessageUpdatedEventData,
  UserTypingData,
  IncomingCallData,
  CallAcceptedData,
  CallDeclinedData,
  CallEndedData,
} from '../types/realtime'
import type {
  Conversation,
} from '../types'
import { WebSocketEventType } from '../types/realtime'
import { MessageStatus } from '../types'
import { conversationService } from '../services/conversation.service'
import { socketService } from '../services/socket'
import { useAuthStore } from './authStore'
import { useCallStore } from './callStore'
import type { ChatState } from './chat.types'
import { moveConversationToTop, updateConversationInList } from './chat.helpers'

type ChatSetState = StoreApi<ChatState>['setState']
type ChatGetState = StoreApi<ChatState>['getState']

let registered = false

const buildLastMessagePreview = (message: { type?: string; content?: string }): string => {
  const content = (message.content || '').trim()
  if (message.type === MessageType.IMAGE) return content ? `📷 ${content}` : '📷 Photo'
  if (message.type === MessageType.FILE) return content ? `📎 ${content}` : '📎 File'
  if (message.type === MessageType.VIDEO) return content ? `🎬 ${content}` : '🎬 Video'
  if (message.type === MessageType.AUDIO) return content ? `🎵 ${content}` : '🎵 Audio'
  return content
}

export const registerChatRealtimeListeners = (set: ChatSetState, get: ChatGetState) => {
  if (registered) return
  registered = true

  socketService.on(WebSocketEventType.NEW_MESSAGE, (eventData: MessageCreatedEventData) => {
    const { currentConversation, messages, conversations } = get()
    const { conversation, message } = eventData
    const currentUser = useAuthStore.getState().user

    if (message.conversationId === currentConversation?.id) {
      const idx = messages.findIndex(
        (m) => m.id === message.id || (message.clientMsgId && m.clientMsgId === message.clientMsgId),
      )
      if (idx >= 0) {
        const updated = [...messages]
        updated[idx] = { ...message, status: MessageStatus.SENT }
        set({ messages: updated })
      } else {
        set({ messages: [...messages, message] })
      }
    }

    const existingConversation = conversations.find((conv) => conv.id === message.conversationId)
    const isCurrentConversation = currentConversation?.id === message.conversationId
    const isFromMe = message.senderId === currentUser?.id

    if (!existingConversation) {
      const newConversation: Conversation = {
        ...conversation,
        lastMessageText: buildLastMessagePreview(message),
        lastMessageAt: message.createdAt,
        lastMessageSenderId: message.senderId,
        lastMessageSenderName: message.senderName,
        isLastMessageFromMe: isFromMe,
        seen: isFromMe ? false : isCurrentConversation,
        unreadCount: isFromMe ? 0 : isCurrentConversation ? 0 : 1,
      }
      set({ conversations: [newConversation, ...conversations] })
      return
    }

    const updates: Partial<Conversation> = {
      lastMessageText: buildLastMessagePreview(message),
      lastMessageAt: message.createdAt,
      lastMessageSenderId: message.senderId,
      lastMessageSenderName: message.senderName,
      isLastMessageFromMe: isFromMe,
      seen: isFromMe ? false : isCurrentConversation,
      participantCount: conversation.participantCount,
    }

    if (!isCurrentConversation && !isFromMe) {
      updates.unreadCount = (existingConversation.unreadCount || 0) + 1
    } else if (isCurrentConversation) {
      updates.unreadCount = 0
    }

    set({
      conversations: moveConversationToTop(
        updateConversationInList(conversations, message.conversationId, updates),
        message.conversationId,
      ),
    })

    if (isCurrentConversation && !isFromMe) {
      conversationService.markAsRead(message.conversationId).catch(() => {})
    }
  })

  socketService.on(WebSocketEventType.MESSAGE_UPDATED, (eventData: MessageUpdatedEventData) => {
    const { currentConversation, messages, conversations } = get()
    const { conversation, message } = eventData

    if (message.conversationId === currentConversation?.id) {
      set({
        messages: messages.map((msg) => (msg.id === message.id ? message : msg)),
      })
    }

    set({
      conversations: moveConversationToTop(
        updateConversationInList(conversations, message.conversationId, {
          lastMessageText: buildLastMessagePreview(message),
          lastMessageAt: message.updatedAt,
          participantCount: conversation.participantCount,
        }),
        message.conversationId,
      ),
    })
  })

  socketService.on(WebSocketEventType.MESSAGE_DELETED, (eventData: MessageDeletedEventData) => {
    const { currentConversation, messages } = get()

    if (eventData.conversation.id === currentConversation?.id) {
      set({ messages: messages.filter((message) => message.id !== eventData.messageId) })
    }
  })

  socketService.on(WebSocketEventType.MESSAGE_REACTION_UPDATED, (data: MessageReactionUpdatedEventData) => {
    const { currentConversation, messages } = get()
    if (currentConversation?.id !== data.conversationId) return
    set({
      messages: messages.map((m) =>
        m.id === data.messageId ? { ...m, reactions: data.reactions } : m,
      ),
    })
  })

  socketService.on(WebSocketEventType.CONVERSATION_CREATED, (data: ConversationCreatedData) => {
    console.log('CONVERSATION_CREATED received, refetching list:', data.id)
    get().loadConversations()
  })

  socketService.on(WebSocketEventType.CONVERSATION_UPDATED, (data: ConversationUpdatedData) => {
    const { conversations, currentConversation } = get()
    if (data.id && data.seen !== undefined) {
      set({
        conversations: updateConversationInList(conversations, data.id, { seen: data.seen }),
        ...(currentConversation?.id === data.id
          ? { currentConversation: { ...currentConversation, seen: data.seen } }
          : {}),
      })
    } else {
      console.log('CONVERSATION_UPDATED received, refetching list:', data.id)
      get().loadConversations()
    }
  })

  socketService.on(WebSocketEventType.CONVERSATION_DELETED, (data: ConversationDeletedData) => {
    const { currentConversation, conversations } = get()

    set({ conversations: conversations.filter((conversation) => conversation.id !== data.conversationId) })

    if (currentConversation?.id === data.conversationId) {
      set({
        currentConversation: null,
        messages: [],
        typingUsers: new Map(),
        typingTimeouts: new Map(),
      })
    }

    console.log('Conversation deleted:', data.conversationId)
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
      const updatedTypingUsers = new Map(current)
      const updatedTypingTimeouts = new Map(timeouts)
      updatedTypingUsers.delete(data.userId)
      updatedTypingTimeouts.delete(data.userId)
      set({ typingUsers: updatedTypingUsers, typingTimeouts: updatedTypingTimeouts })
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

  // ── Call events ─────────────────────────────────────────────────────────
  socketService.on(WebSocketEventType.INCOMING_CALL, (data: IncomingCallData) => {
    useCallStore.getState().onIncoming(data)
  })

  socketService.on(WebSocketEventType.CALL_ACCEPTED, (data: CallAcceptedData) => {
    useCallStore.getState().onAccepted(data)
  })

  socketService.on(WebSocketEventType.CALL_DECLINED, (data: CallDeclinedData) => {
    useCallStore.getState().onDeclined(data)
  })

  socketService.on(WebSocketEventType.CALL_ENDED, (data: CallEndedData) => {
    useCallStore.getState().onEnded(data)
  })
}
