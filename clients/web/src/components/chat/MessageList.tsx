import { useMemo } from 'react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { useAutoScrollToBottom } from '../../hooks/useAutoScrollToBottom'
import type { Conversation, Message, User } from '../../types'
import type { TypingUserInfo } from '../../store/chat.types'

interface MessageListProps {
  conversation: Conversation
  messages: Message[]
  typingUsers: Map<string, TypingUserInfo>
  user: User | null
}

const STREAK_GAP_MS = 5 * 60 * 1000

export const MessageList = ({ conversation, messages, typingUsers, user }: MessageListProps) => {
  const sortedMessages = useMemo(
    () =>
      messages
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages],
  )

  const scrollTrigger = `${conversation.id}:${sortedMessages.length}:${typingUsers.size}`
  const messagesEndRef = useAutoScrollToBottom(scrollTrigger)

  let lastOwnIdx = -1
  for (let i = sortedMessages.length - 1; i >= 0; i--) {
    if (sortedMessages[i].senderId === user?.id) {
      lastOwnIdx = i
      break
    }
  }

  const isGroup = conversation.type === 'group'

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 scrollbar-thin bg-surface-base">
      {sortedMessages.map((message, idx) => {
        const prev = sortedMessages[idx - 1]
        const next = sortedMessages[idx + 1]
        const currentTime = new Date(message.createdAt).getTime()

        const sameSenderAsPrev =
          !!prev &&
          prev.senderId === message.senderId &&
          currentTime - new Date(prev.createdAt).getTime() < STREAK_GAP_MS

        const sameSenderAsNext =
          !!next &&
          next.senderId === message.senderId &&
          new Date(next.createdAt).getTime() - currentTime < STREAK_GAP_MS

        const isFirstInStreak = !sameSenderAsPrev
        const isLastInStreak = !sameSenderAsNext

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isOwnMessage={message.senderId === user?.id}
            isLastOwnMessage={idx === lastOwnIdx}
            conversationSeen={!!conversation.isLastMessageFromMe && !!conversation.seen}
            isGroup={isGroup}
            isFirstInStreak={isFirstInStreak}
            isLastInStreak={isLastInStreak}
            showTime={isLastInStreak}
          />
        )
      })}
      {typingUsers.size > 0 && <TypingIndicator typingUsers={typingUsers} />}
      <div ref={messagesEndRef} />
    </div>
  )
}
