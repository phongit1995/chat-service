import type { FormEvent } from 'react'
import type { TempChatUser } from '@chat/shared'

export interface NewChatViewProps {
  tempChatUser: TempChatUser
  messageInput: string
  isCreatingConversation: boolean
  onMessageChange: (value: string) => void
  onSendMessage: (e: FormEvent) => void
  onBack?: () => void
}
