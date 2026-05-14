import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { useChatUIStore } from '../../store/chatUIStore'
import { usePresenceStore } from '../../store/presenceStore'
import { useConversationsWithPresence, useConversationWithPresence } from '../../store/useConversationsWithPresence'
import { ProfileEditModal } from '../../components/ProfileEditModal'
import { SearchModal } from '../../components/search/SearchModal'
import { ChatSidebar } from './ChatSidebar'
import { ChatArea } from './ChatArea'
import { NewChatView } from './NewChatView'
import { EmptyState } from './EmptyState'
import { UserProfilePage } from '../user-profile/UserProfilePage'
import type { UserSearchResult } from '../../types'

export const Chat = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const {
    currentConversation: rawCurrentConversation,
    messages,
    typingUsers,
    handleConversationClick,
    handleSendMessage,
    handleInputChange,
    handleSelectUser,
    hideConversation,
    initialize,
  } = useChatStore()

  const conversations = useConversationsWithPresence()
  const currentConversation = useConversationWithPresence(rawCurrentConversation?.id)

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

  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    const presence = usePresenceStore.getState()
    presence.startListPolling(() => {
      return useChatStore
        .getState()
        .conversations
        .filter((c) => c.type === 'direct' && c.otherUser?.id)
        .map((c) => c.otherUser!.id)
    })
    return () => {
      usePresenceStore.getState().stopListPolling()
    }
  }, [])

  useEffect(() => {
    const presence = usePresenceStore.getState()
    const otherId = currentConversation?.type === 'direct' ? currentConversation.otherUser?.id : null
    if (otherId) {
      presence.startFocusPolling(otherId)
    } else {
      presence.stopFocusPolling()
    }
    return () => {
      presence.stopFocusPolling()
    }
  }, [currentConversation?.id, currentConversation?.type, currentConversation?.otherUser?.id])

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
    setShowSearch(false)
    setViewProfileUserId(result.id)
  }

  const handleProfileStartChat = (userId: string) => {
    setViewProfileUserId(null)
    const result = { id: userId } as UserSearchResult
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
          onHideConversation={hideConversation}
        />
      </div>

      <div className="flex-1 flex flex-col bg-surface-base">
        {viewProfileUserId ? (
          <UserProfilePage
            userId={viewProfileUserId}
            onBack={() => setViewProfileUserId(null)}
            onStartChat={handleProfileStartChat}
          />
        ) : tempChatUser && !currentConversation ? (
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

    </div>
  )
}
