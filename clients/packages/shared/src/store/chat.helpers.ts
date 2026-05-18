import type { Conversation } from '../types'

export const moveConversationToTop = (
  conversations: Conversation[],
  conversationId: string,
): Conversation[] => {
  const targetIndex = conversations.findIndex((conversation) => conversation.id === conversationId)
  if (targetIndex <= 0) return conversations

  const next = [...conversations]
  const [targetConversation] = next.splice(targetIndex, 1)
  return [targetConversation, ...next]
}

export const updateConversationInList = (
  conversations: Conversation[],
  conversationId: string,
  updates: Partial<Conversation>,
): Conversation[] => {
  return conversations.map((conversation) =>
    conversation.id === conversationId ? { ...conversation, ...updates } : conversation,
  )
}
