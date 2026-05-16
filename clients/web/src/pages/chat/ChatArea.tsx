import { FormEvent, ChangeEvent } from 'react'
import { Button } from '../../components/ui'
import { ChatHeader, MessageList } from '../../components/chat'
import type { Conversation, Message, User } from '../../types'
import type { TypingUserInfo } from '../../store/chat.types'

interface ChatAreaProps {
  conversation: Conversation
  messages: Message[]
  messageInput: string
  typingUsers: Map<string, TypingUserInfo>
  user: User | null
  onMessageChange: (e: ChangeEvent<HTMLInputElement>) => void
  onSendMessage: (e: FormEvent) => void
  onBack?: () => void
}

export const ChatArea = ({
  conversation,
  messages,
  messageInput,
  typingUsers,
  user,
  onMessageChange,
  onSendMessage,
  onBack,
}: ChatAreaProps) => {
  return (
    <>
      <ChatHeader conversation={conversation} onBack={onBack} />
      <MessageList
        conversation={conversation}
        messages={messages}
        typingUsers={typingUsers}
        user={user}
      />

      <div
        className="border-t border-line-subtle bg-surface/95 backdrop-blur-sm px-3 sm:px-4 pt-3 sm:pt-4"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        <form onSubmit={onSendMessage} className="flex items-center gap-2 sm:gap-3">
          <input
            type="text"
            value={messageInput}
            onChange={onMessageChange}
            placeholder="Type a message…"
            className="message-input flex-1 min-w-0"
          />
          <Button
            type="submit"
            disabled={!messageInput.trim()}
            variant="primary"
            size="md"
            aria-label="Send"
            className="!px-4 sm:!px-5 shrink-0"
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
