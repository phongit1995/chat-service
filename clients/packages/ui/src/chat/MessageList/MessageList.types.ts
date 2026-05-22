import type { Conversation, Message, TypingUserInfo, User } from '@chat/shared'

export interface MessageListProps {
  conversation: Conversation
  messages: Message[]
  typingUsers: Map<string, TypingUserInfo>
  user: User | null
  onOpenProfile?: (userId: string) => void
}

export interface MessageRow {
  message: Message
  isOwnMessage: boolean
  isLastOwnMessage: boolean
  isFirstInStreak: boolean
  isLastInStreak: boolean
}
