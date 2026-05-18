import { create } from 'zustand'
import type { TempChatUser } from '../types'

interface ChatUIState {
  messageInput: string
  isTyping: boolean
  showSearch: boolean
  showProfileEdit: boolean
  tempChatUser: TempChatUser | null
  isCreatingConversation: boolean

  setMessageInput: (input: string) => void
  setIsTyping: (typing: boolean) => void
  setShowSearch: (show: boolean) => void
  setShowProfileEdit: (show: boolean) => void
  setTempChatUser: (user: TempChatUser | null) => void
  setIsCreatingConversation: (creating: boolean) => void
  reset: () => void
}

export const useChatUIStore = create<ChatUIState>((set) => ({
  messageInput: '',
  isTyping: false,
  showSearch: false,
  showProfileEdit: false,
  tempChatUser: null,
  isCreatingConversation: false,

  setMessageInput: (input) => set({ messageInput: input }),
  setIsTyping: (isTyping) => set({ isTyping }),
  setShowSearch: (showSearch) => set({ showSearch }),
  setShowProfileEdit: (showProfileEdit) => set({ showProfileEdit }),
  setTempChatUser: (tempChatUser) => set({ tempChatUser }),
  setIsCreatingConversation: (isCreatingConversation) => set({ isCreatingConversation }),

  reset: () =>
    set({
      messageInput: '',
      isTyping: false,
      showSearch: false,
      showProfileEdit: false,
      tempChatUser: null,
      isCreatingConversation: false,
    }),
}))
