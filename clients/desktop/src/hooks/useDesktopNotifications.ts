import { useEffect } from 'react'
import { useAuthStore, useChatStore, socketService } from '@chat/shared'
import { WebSocketEventType } from '@chat/shared'

const previewText = (msg: { type?: string; content?: string }): string => {
  const c = (msg.content || '').trim()
  if (msg.type === 'image') return c || '📷 Photo'
  if (msg.type === 'file') return c || '📎 File'
  if (msg.type === 'video') return c || '🎬 Video'
  if (msg.type === 'audio') return c || '🎵 Audio'
  return c
}

export const useDesktopNotifications = () => {
  useEffect(() => {
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
  }, [])

  useEffect(() => {
    const update = () => {
      const conversations = useChatStore.getState().conversations
      const unread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
      window.desktop.setBadge(unread)
    }
    update()
    const unsub = useChatStore.subscribe(update)
    return () => unsub()
  }, [])
}
