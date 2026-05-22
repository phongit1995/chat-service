import type { Message } from '@chat/shared'
import type { MessageRow } from './MessageList.types'

const STREAK_GAP_MS = 5 * 60 * 1000

export const buildMessageRows = (messages: Message[], userId: string | undefined): MessageRow[] => {
  const sorted = messages
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  let lastOwnIdx = -1
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].senderId === userId) {
      lastOwnIdx = i
      break
    }
  }

  return sorted.map((message, idx) => {
    const prev = sorted[idx - 1]
    const next = sorted[idx + 1]
    const currentTime = new Date(message.createdAt).getTime()
    const sameSenderAsPrev =
      !!prev &&
      prev.senderId === message.senderId &&
      currentTime - new Date(prev.createdAt).getTime() < STREAK_GAP_MS
    const sameSenderAsNext =
      !!next &&
      next.senderId === message.senderId &&
      new Date(next.createdAt).getTime() - currentTime < STREAK_GAP_MS
    return {
      message,
      isOwnMessage: message.senderId === userId,
      isLastOwnMessage: idx === lastOwnIdx,
      isFirstInStreak: !sameSenderAsPrev,
      isLastInStreak: !sameSenderAsNext,
    }
  })
}
