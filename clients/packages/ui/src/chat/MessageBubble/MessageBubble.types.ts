import type { Message } from '@chat/shared'

export interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
  isLastOwnMessage?: boolean
  conversationSeen?: boolean
  isGroup?: boolean
  isFirstInStreak?: boolean
  isLastInStreak?: boolean
  showTime?: boolean
  myUserId?: string
  onReact?: (messageId: string, type: string) => void
  onOpenProfile?: (userId: string) => void
  onImageLoaded?: () => void
}
