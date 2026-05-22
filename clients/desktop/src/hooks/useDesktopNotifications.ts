import { useEffect } from 'react'
import { useAuthStore, useChatStore, socketService, MessageType} from '@chat/shared'
import { WebSocketEventType } from '@chat/shared'

const previewText = (msg: { type?: string; content?: string }): string => {
  const c = (msg.content || '').trim()
  if (msg.type === MessageType.IMAGE) return c || '📷 Photo'
  if (msg.type === MessageType.FILE) return c || '📎 File'
  if (msg.type === MessageType.VIDEO) return c || '🎬 Video'
  if (msg.type === MessageType.AUDIO) return c || '🎵 Audio'
  return c
}

export const useDesktopNotifications = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return
    const me = useAuthStore.getState().user
    if (!me) return

    const off = socketService.on(WebSocketEventType.NEW_MESSAGE, (data: unknown) => {
      const evt = data as { message?: { senderId?: string; senderName?: string; type?: string; content?: string; conversationId?: string } }
      const msg = evt?.message
      if (!msg || msg.senderId === me.id) return

      const isFocused = !document.hidden && document.hasFocus()
      if (isFocused && useChatStore.getState().currentConversation?.id === msg.conversationId) return

      window.desktop.showNotification(msg.senderName || 'New message', previewText(msg))
    })

    return () => off()
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const update = () => {
      const conversations = useChatStore.getState().conversations
      const unread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
      window.desktop.setBadge(unread)
    }
    update()
    const unsub = useChatStore.subscribe(update)
    return () => unsub()
  }, [enabled])
}
