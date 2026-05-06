import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { socketService } from '../../services/socket'
import { ProfileEditModal } from '../../components/ProfileEditModal'
import { ChatSidebar } from './ChatSidebar'
import { UserSearch } from './UserSearch'
import { ChatArea } from './ChatArea'
import { NewChatView } from './NewChatView'
import { EmptyState } from './EmptyState'

export const Chat = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const {
    conversations,
    currentConversation,
    messages,
    typingUsers,
    messageInput,
    showSearch,
    tempChatUser,
    isCreatingConversation,
    showProfileEdit,
    setShowSearch,
    setShowProfileEdit,
    handleConversationClick,
    handleSendMessage,
    handleInputChange,
    handleSelectUser,
    initialize,
  } = useChatStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  const handleLogout = () => {
    socketService.disconnect()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-surface-base">
      <div className="w-80 bg-surface border-r border-line-subtle flex flex-col shadow-soft-md">
        <ChatSidebar
          user={user}
          conversations={conversations}
          currentConversation={currentConversation}
          onProfileClick={() => setShowProfileEdit(true)}
          onNewChatClick={() => setShowSearch(!showSearch)}
          onLogout={handleLogout}
          onConversationClick={handleConversationClick}
        />
        <UserSearch show={showSearch} onSelectUser={handleSelectUser} />
      </div>

      <div className="flex-1 flex flex-col bg-surface-base">
        {tempChatUser && !currentConversation ? (
          <NewChatView
            tempChatUser={tempChatUser}
            messageInput={messageInput}
            isCreatingConversation={isCreatingConversation}
            onMessageChange={(val) => useChatStore.setState({ messageInput: val })}
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

      <ProfileEditModal
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
      />
    </div>
  )
}