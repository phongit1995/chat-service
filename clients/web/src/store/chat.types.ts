import type { Conversation, Message, UserSearchResult } from '../types'

export interface TypingUserInfo {
  userId: string
  username: string
}

export interface TempChatUser {
  id: string
  username: string
  fullName?: string
  avatar?: string
  conversationId?: string
}

export interface ChatState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  messages: Message[]
  typingUsers: Map<string, TypingUserInfo>
  typingTimeouts: Map<string, ReturnType<typeof setTimeout>>
  isLoading: boolean
  error: string | null
  messageInput: string
  isTyping: boolean
  showSearch: boolean
  tempChatUser: TempChatUser | null
  isCreatingConversation: boolean
  showProfileEdit: boolean

  loadConversations: () => Promise<void>
  selectConversation: (conversationId: string | null) => Promise<void>
  loadMessages: (conversationId: string) => Promise<void>
  sendMessage: (conversationId: string, content: string) => Promise<void>
  createGroupConversation: (name: string, participantIds: string[]) => Promise<void>
  addMessage: (message: Message) => void
  setTyping: (userId: string, isTyping: boolean, username?: string) => void
  markAsRead: (conversationId: string) => Promise<void>
  setMessageInput: (input: string) => void
  setIsTyping: (typing: boolean) => void
  setShowSearch: (show: boolean) => void
  setTempChatUser: (user: TempChatUser | null) => void
  setIsCreatingConversation: (creating: boolean) => void
  setShowProfileEdit: (show: boolean) => void
  handleConversationClick: (conversationId: string) => void
  handleSendMessage: () => Promise<void>
  handleInputChange: (value: string) => void
  handleSelectUser: (result: UserSearchResult) => Promise<void>
  handleSendMessageToNewUser: () => Promise<void>
  handleTyping: (typing: boolean) => Promise<void>
  initialize: () => Promise<void>
  clearError: () => void
  reset: () => void
}
