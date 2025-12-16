import { useEffect, useState, FormEvent, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { socketService } from '../../services/socket'
import { apiService } from '../../services/api'
import { ProfileEditModal } from '../../components/ProfileEditModal'
import { ChatSidebar } from './ChatSidebar'
import { UserSearch } from './UserSearch'
import { ChatArea } from './ChatArea'
import { NewChatView } from './NewChatView'
import { EmptyState } from './EmptyState'
import type { UserSearchResult, TempChatUser } from '../../types'

export const Chat = () => {
  const navigate = useNavigate()
  const { user, logout, loadUser } = useAuthStore()
  const {
    conversations,
    currentConversation,
    messages,
    loadConversations,
    selectConversation,
    sendMessage,
    typingUsers,
  } = useChatStore()

  const [messageInput, setMessageInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [tempChatUser, setTempChatUser] = useState<TempChatUser | null>(null)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    loadConversations()
    loadUser()
  }, [loadConversations, loadUser])

  const handleLogout = () => {
    socketService.disconnect()
    logout()
    navigate('/login', { replace: true })
  }

  const handleConversationClick = (conversationId: string) => {
    setTempChatUser(null)
    selectConversation(conversationId)
  }

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault()
    
    if (tempChatUser && !currentConversation) {
      await handleSendMessageToNewUser()
      return
    }
    
    if (!messageInput.trim() || !currentConversation) return

    try {
      await sendMessage(currentConversation.id, messageInput.trim())
      setMessageInput('')
      handleTyping(false)
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    }
  }

  const handleTyping = async (typing: boolean) => {
    if (!currentConversation) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (typing && !isTyping) {
      setIsTyping(true)
      try {
        await apiService.sendTypingIndicator(currentConversation.id)
      } catch (error) {
        console.error('Failed to send typing indicator:', error)
      }
    }

    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
      }, 3000)
    } else {
      setIsTyping(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)
    handleTyping(true)
  }

  const handleSelectUser = async (result: UserSearchResult) => {
    try {
      setTempChatUser(null)
      selectConversation(null)
      
      const response = await apiService.checkDirectConversation(result.id)
      const convData = response.data

      if (convData && convData.id) {
        const existingConv = conversations.find(c => c.id === convData.id)
        
        if (existingConv) {
          selectConversation(convData.id)
        } else {
          await loadConversations()
          selectConversation(convData.id)
        }
      } else {
        setTempChatUser({
          id: result.id,
          username: result.username,
          fullName: result.fullName,
          avatar: result.avatar,
          conversationId: undefined
        })
      }
      
      setShowSearch(false)
    } catch (error) {
      console.error('Failed to check conversation:', error)
      selectConversation(null)
      setTempChatUser({
        id: result.id,
        username: result.username,
        fullName: result.fullName,
        avatar: result.avatar,
        conversationId: undefined
      })
      setShowSearch(false)
    }
  }

  const handleSendMessageToNewUser = async () => {
    if (!messageInput.trim() || !tempChatUser || isCreatingConversation) return

    try {
      setIsCreatingConversation(true)
      
      await apiService.sendDirectMessage(tempChatUser.id, messageInput.trim())
      await loadConversations()
      
      const convResponse = await apiService.checkDirectConversation(tempChatUser.id)
      if (convResponse.data && convResponse.data.id) {
        selectConversation(convResponse.data.id)
      }
      
      setTempChatUser(null)
      setMessageInput('')
      toast.success('Message sent!')
    } catch (error) {
      console.error('Failed to send direct message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsCreatingConversation(false)
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-xl">
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

      <div className="flex-1 flex flex-col bg-white chat-pattern">
        {tempChatUser && !currentConversation ? (
          <NewChatView
            tempChatUser={tempChatUser}
            messageInput={messageInput}
            isCreatingConversation={isCreatingConversation}
            onMessageChange={setMessageInput}
            onSendMessage={handleSendMessage}
          />
        ) : currentConversation ? (
          <ChatArea
            conversation={currentConversation}
            messages={messages}
            messageInput={messageInput}
            typingUsers={typingUsers}
            user={user}
            onMessageChange={handleInputChange}
            onSendMessage={handleSendMessage}
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