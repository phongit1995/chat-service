import type { Conversation } from '@chat/shared'

export interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
  onHide?: () => void
}
