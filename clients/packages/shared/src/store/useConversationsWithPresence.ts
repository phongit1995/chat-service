import { useChatStore } from './chatStore'
import { usePresenceStore } from './presenceStore'
import type { Conversation } from '../types'

export const useConversationsWithPresence = (): Conversation[] => {
  const conversations = useChatStore((s) => s.conversations)
  const presence = usePresenceStore((s) => s.presence)

  return conversations.map((c) => {
    const otherId = c.otherUser?.id
    if (!otherId) return c
    const live = presence.get(otherId)
    if (!live) return c
    return {
      ...c,
      otherUser: {
        ...c.otherUser!,
        isOnline: live.isOnline,
        lastActiveAt: live.lastActiveAt,
      },
    }
  })
}

export const useConversationWithPresence = (conversationId?: string | null): Conversation | null => {
  const conversation = useChatStore((s) =>
    conversationId ? s.conversations.find((c) => c.id === conversationId) : undefined,
  )
  const otherId = conversation?.otherUser?.id
  const live = usePresenceStore((s) => (otherId ? s.presence.get(otherId) : undefined))

  if (!conversation) return null
  if (!live) return conversation
  return {
    ...conversation,
    otherUser: {
      ...conversation.otherUser!,
      isOnline: live.isOnline,
      lastActiveAt: live.lastActiveAt,
    },
  }
}
