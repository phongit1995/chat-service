import { FormEvent, useRef, useEffect, ChangeEvent } from 'react'
import { Button } from '../../components/ui'
import { ChatHeader, MessageBubble, TypingIndicator } from '../../components/chat'
import type { Conversation, Message, User } from '../../types'

interface TypingUserInfo {
  userId: string
  username: string
}

interface ChatAreaProps {
  conversation: Conversation
  messages: Message[]
  messageInput: string
  typingUsers: Map<string, TypingUserInfo>
  user: User | null
  onMessageChange: (e: ChangeEvent<HTMLInputElement>) => void
  onSendMessage: (e: FormEvent) => void
}

export const ChatArea = ({
  conversation,
  messages,
  messageInput,
  typingUsers,
  user,
  onMessageChange,
  onSendMessage,
}: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <>
      <ChatHeader conversation={conversation} />

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin bg-surface-base">
        {(() => {
          const sorted = messages
            .slice()
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

          const STREAK_GAP_MS = 5 * 60 * 1000
          const isGroup = conversation.type === 'group'

          let lastOwnIdx = -1
          for (let i = sorted.length - 1; i >= 0; i--) {
            if (sorted[i].senderId === user?.id) {
              lastOwnIdx = i
              break
            }
          }

          return sorted.map((message, idx) => {
            const prev = sorted[idx - 1]
            const next = sorted[idx + 1]
            const t = new Date(message.createdAt).getTime()

            const sameSenderAsPrev =
              !!prev &&
              prev.senderId === message.senderId &&
              t - new Date(prev.createdAt).getTime() < STREAK_GAP_MS

            const sameSenderAsNext =
              !!next &&
              next.senderId === message.senderId &&
              new Date(next.createdAt).getTime() - t < STREAK_GAP_MS

            const isFirstInStreak = !sameSenderAsPrev
            const isLastInStreak = !sameSenderAsNext

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.senderId === user?.id}
                isLastOwnMessage={idx === lastOwnIdx}
                conversationSeen={!!conversation.seen}
                isGroup={isGroup}
                isFirstInStreak={isFirstInStreak}
                isLastInStreak={isLastInStreak}
                showTime={isLastInStreak}
              />
            )
          })
        })()}
        {typingUsers.size > 0 && <TypingIndicator typingUsers={typingUsers} />}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-line-subtle bg-surface/95 backdrop-blur-sm p-4">
        <form onSubmit={onSendMessage} className="flex items-center gap-3">
          <input
            type="text"
            value={messageInput}
            onChange={onMessageChange}
            placeholder="Type a message…"
            className="message-input flex-1"
          />
          <Button
            type="submit"
            disabled={!messageInput.trim()}
            variant="primary"
            size="md"
            aria-label="Send"
            className="!px-5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </form>
      </div>
    </>
  )
}
