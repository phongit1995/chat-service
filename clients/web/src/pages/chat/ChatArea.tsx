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
  return (
    <>
      <ChatHeader conversation={conversation} />
      <MessageList
        conversation={conversation}
        messages={messages}
        typingUsers={typingUsers}
        user={user}
      />

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
