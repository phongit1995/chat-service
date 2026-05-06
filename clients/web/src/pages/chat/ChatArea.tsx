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

      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin bg-surface-base">
        {messages
          .slice()
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwnMessage={message.senderId === user?.id}
            />
          ))}
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
