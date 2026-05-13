import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { useChatUIStore } from '../../store/chatUIStore'
import { ProfileEditModal } from '../../components/ProfileEditModal'
import { ProfileViewModal } from '../../components/ProfileViewModal'
import { SearchModal } from '../../components/search/SearchModal'
import { ChatSidebar } from './ChatSidebar'
import { ChatArea } from './ChatArea'
import { NewChatView } from './NewChatView'
import { EmptyState } from './EmptyState'
import type { UserSearchResult } from '../../types'

interface ViewProfileUser {
  id: string
  username?: string
  fullName?: string
  avatar?: string
  bio?: string
  email?: string
}

export const Chat = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const {
    conversations,
    currentConversation,
    messages,
    typingUsers,
    handleConversationClick,
    handleSendMessage,
    handleInputChange,
    handleSelectUser,
    initialize,
  } = useChatStore()

  const {
    messageInput,
    showSearch,
    tempChatUser,
    isCreatingConversation,
    showProfileEdit,
    setShowSearch,
    setShowProfileEdit,
    setMessageInput,
  } = useChatUIStore()

  const [viewProfile, setViewProfile] = useState<ViewProfileUser | null>(null)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const cmd = isMac ? e.metaKey : e.ctrlKey
      if (cmd && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setShowSearch])

  const handleLogout = () => {
    useChatStore.getState().reset()
    logout()
    navigate('/login', { replace: true })
  }

  const handleSearchSelectUser = (result: UserSearchResult) => {
    handleSelectUser(result)
  }

  const handleSearchSelectConversation = (conversationId: string) => {
    handleConversationClick(conversationId)
  }

  return (
    <div className="flex h-screen bg-surface-base">
      <div className="w-80 bg-surface border-r border-line-subtle flex flex-col shadow-soft-md">
        <ChatSidebar
          user={user}
          conversations={conversations}
          currentConversation={currentConversation}
          onProfileClick={() => setShowProfileEdit(true)}
          onNewChatClick={() => setShowSearch(true)}
          onLogout={handleLogout}
          onConversationClick={handleConversationClick}
        />
      </div>

      <div className="flex-1 flex flex-col bg-surface-base">
        {tempChatUser && !currentConversation ? (
          <NewChatView
            tempChatUser={tempChatUser}
            messageInput={messageInput}
            isCreatingConversation={isCreatingConversation}
            onMessageChange={(val) => setMessageInput(val)}
            onSendMessage={(e) => { e.preventDefault(); handleSendMessage(); }}
          />
        ) : currentConversation ? (
          <ChatArea
            conversation={currentConversation}
            messages={messages}
            messageInput={messageInput}
            typingUsers={typingUsers}
            user={user}
            onMessageChange={(e) => handleInputChange(e.target.value)}
            onSendMessage={(e) => { e.preventDefault(); handleSendMessage(); }}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        conversations={conversations}
        onSelectUser={handleSearchSelectUser}
        onSelectConversation={handleSearchSelectConversation}
      />

      <ProfileEditModal
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
      />

      <ProfileViewModal
        isOpen={!!viewProfile}
        onClose={() => setViewProfile(null)}
        user={viewProfile}
      />
    </div>
  )
}
