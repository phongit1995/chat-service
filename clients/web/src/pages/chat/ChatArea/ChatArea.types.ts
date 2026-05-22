import type { FormEvent } from 'react'
import type { Conversation, Message, User, TypingUserInfo } from '@chat/shared'

export interface ChatAreaProps {
  conversation: Conversation
  messages: Message[]
  messageInput: string
  typingUsers: Map<string, TypingUserInfo>
  user: User | null
  onSetMessageInput: (value: string) => void
  onSendMessage: (e: FormEvent) => void
  onSendImage: (file: File) => Promise<void>
  onBack?: () => void
  onOpenProfile?: (userId: string) => void
}
