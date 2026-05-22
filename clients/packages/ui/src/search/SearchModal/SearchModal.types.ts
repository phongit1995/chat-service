import type { Conversation, UserSearchResult } from '@chat/shared'

export interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  conversations: Conversation[]
  onSelectUser: (user: UserSearchResult) => void
  onSelectConversation: (conversationId: string) => void
}

export type SearchResultRow =
  | { kind: 'conversation'; conv: Conversation }
  | { kind: 'user'; user: UserSearchResult }
