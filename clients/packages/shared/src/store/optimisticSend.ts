import toast from 'react-hot-toast'
import type { StoreApi } from 'zustand'
import { MessageStatus } from '../types'
import type { ApiResponse, Message } from '../types'
import type { ChatState } from './chat.types'
import { useAuthStore } from './authStore'

type Set = StoreApi<ChatState>['setState']
type Get = StoreApi<ChatState>['getState']

interface SenderInfo {
  senderId: string
  senderName?: string
  senderAvatar?: string
}

const currentSender = (): SenderInfo => {
  const u = useAuthStore.getState().user
  return {
    senderId: u?.id || '',
    senderName: u?.fullName || u?.username,
    senderAvatar: u?.avatarURL || u?.avatar,
  }
}

export const readImageDimensions = (url: string): Promise<{ w: number; h: number }> =>
  new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 0, h: 0 })
    img.src = url
  })

interface OptimisticSendArgs {
  conversationId: string
  get: Get
  set: Set
  build: (clientMsgId: string, now: string, sender: SenderInfo) => Message
  send: (clientMsgId: string) => Promise<ApiResponse<Message>>
  cleanup?: () => void
  errorFallback: string
  toastOnError?: boolean
  rethrow?: boolean
}

export const sendWithOptimistic = async (args: OptimisticSendArgs): Promise<void> => {
  const { conversationId, get, set, build, send, cleanup, errorFallback, toastOnError, rethrow } = args
  const clientMsgId = crypto.randomUUID()
  const now = new Date().toISOString()
  const optimistic = build(clientMsgId, now, currentSender())

  const { currentConversation, messages } = get()
  if (currentConversation?.id === conversationId) {
    set({ messages: [...messages, optimistic] })
  }

  try {
    const res = await send(clientMsgId)
    const serverMsg = res.data
    if (serverMsg) {
      const { messages: latest, currentConversation: cc } = get()
      if (cc?.id === conversationId) {
        set({
          messages: latest.map((m) =>
            m.clientMsgId === clientMsgId ? { ...serverMsg, status: MessageStatus.SENT } : m,
          ),
        })
      }
    }
    cleanup?.()
  } catch (error: unknown) {
    cleanup?.()
    const { messages: latest, currentConversation: cc } = get()
    if (cc?.id === conversationId) {
      set({
        messages: latest.map((m) =>
          m.clientMsgId === clientMsgId ? { ...m, status: MessageStatus.FAILED } : m,
        ),
      })
    }
    const errAny = error as { response?: { data?: { error?: string } }; message?: string }
    const msg = errAny?.response?.data?.error || errAny?.message || errorFallback
    set({ error: msg })
    if (toastOnError) toast.error(msg)
    if (rethrow) throw error
  }
}
