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

      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
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

      <div className="border-t backdrop-blur-sm bg-white/95 p-4 shadow-lg">
        <form onSubmit={onSendMessage} className="flex items-center gap-3">
          <input
            type="text"
            value={messageInput}
            onChange={onMessageChange}
            placeholder="Type a message..."
            className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
          />
          <Button
            type="submit"
            disabled={!messageInput.trim()}
            className="rounded-xl px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
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