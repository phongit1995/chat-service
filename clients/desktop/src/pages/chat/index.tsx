import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@chat/shared'
import { useChatStore } from '@chat/shared'
import { useChatUIStore } from '@chat/shared'
import { usePresenceStore } from '@chat/shared'
import { useConversationsWithPresence, useConversationWithPresence } from '@chat/shared'
import { ProfileEditModal } from '@chat/ui'
import { SearchModal } from '../../components/search/SearchModal'
import { ChatSidebar } from './ChatSidebar'
import { ChatArea } from './ChatArea'
import { NewChatView } from './NewChatView'
import { EmptyState } from './EmptyState'
import { UserProfilePage } from '../user-profile/UserProfilePage'
import type { UserSearchResult } from '@chat/shared'

export const Chat = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const {
    currentConversation: rawCurrentConversation,
    messages,
    typingUsers,
    handleConversationClick,
    handleSendMessage,
    handleSelectUser,
    hideConversation,
    initialize,
    sendImageMessage,
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

  useEffect(() => {
    if (!window.desktop?.onMenuCommand) return
    const unsubscribe = window.desktop.onMenuCommand((command) => {
      if (command === 'new-chat' || command === 'search') {
        setShowSearch(true)
      }
    })
    return unsubscribe
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

  const showRightPane = !!(viewProfileUserId || tempChatUser || currentConversation)
  const clearRightPane = () => {
    if (viewProfileUserId) setViewProfileUserId(null)
    else if (currentConversation) useChatStore.setState({ currentConversation: null })
    else if (tempChatUser) useChatUIStore.setState({ tempChatUser: null })
  }

  return (
    <div className="flex h-[100dvh] bg-surface-base overflow-hidden">
      <div
        className={`${
          showRightPane ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 bg-surface md:border-r border-line-subtle flex-col shadow-soft-md`}
      >
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

      <div
        className={`${
          showRightPane ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col bg-surface-base min-w-0`}
      >
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
            onBack={clearRightPane}
          />
        ) : currentConversation ? (
          <ChatArea
            conversation={currentConversation}
            messages={messages}
            messageInput={messageInput}
            typingUsers={typingUsers}
            user={user}
            onSetMessageInput={setMessageInput}
            onSendMessage={(e) => { e.preventDefault(); handleSendMessage(); }}
            onSendImage={(file) => sendImageMessage(currentConversation.id, file)}
            onBack={clearRightPane}
            onOpenProfile={(uid) => setViewProfileUserId(uid)}
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
