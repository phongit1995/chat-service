import { useEffect, useState, FormEvent, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { socketService } from '../services/socket'
import { apiService } from '../services/api'
import { Avatar, Button } from '../components/ui'
import { ConversationItem, MessageBubble, TypingIndicator, ChatHeader } from '../components/chat'
import { ProfileEditModal } from '../components/ProfileEditModal'
import type { UserSearchResult, TempChatUser } from '../types'

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
  } = useChatStore()
  
  const typingUsers = useChatStore((state) => state.typingUsers)

  const [messageInput, setMessageInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [tempChatUser, setTempChatUser] = useState<TempChatUser | null>(null)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    loadConversations()
    loadUser()
  }, [loadConversations, loadUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await apiService.searchUsers(query.trim())
        setSearchResults(response.data?.users || [])
      } catch (error) {
        console.error('Search failed:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  const handleSelectUser = async (result: UserSearchResult) => {
    try {
      setTempChatUser(null)
      
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
      setSearchQuery('')
      setSearchResults([])
    } catch (error) {
      console.error('Failed to check conversation:', error)
      setTempChatUser({
        id: result.id,
        username: result.username,
        fullName: result.fullName,
        avatar: result.avatar,
        conversationId: undefined
      })
      setShowSearch(false)
      setSearchQuery('')
      setSearchResults([])
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
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-xl">
        {/* User Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="flex items-center justify-between relative z-10">
            <button
              onClick={() => setShowProfileEdit(true)}
              className="flex items-center gap-3 hover:bg-white/10 rounded-xl p-1.5 pr-4 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Avatar
                name={user?.fullName || user?.username || ''}
                src={user?.avatar}
                size="md"
                status="online"
              />
              <div className="text-left">
                <h2 className="font-semibold text-white">{user?.fullName || user?.username}</h2>
                <p className="text-xs text-blue-100">Online</p>
              </div>
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 text-white hover:scale-110 active:scale-95"
                title="New Chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 text-white hover:scale-110 active:scale-95"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="p-4 border-b border-gray-200 bg-gray-50 animate-fadeIn">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search users to start chat..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              autoFocus
            />
            {isSearching && (
              <div className="text-center py-3 text-sm text-gray-500">Searching...</div>
            )}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectUser(result)}
                    className="w-full p-3 rounded-lg hover:bg-white transition flex items-center gap-3 text-left border border-transparent hover:border-gray-200"
                  >
                    <Avatar
                      name={result.username || result.fullName || ''}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {result.fullName || result.username}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">@{result.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-4 text-sm text-gray-500">
                No users found
              </div>
            )}
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 py-2 mb-2">Messages</h3>
            {conversations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="font-medium">No conversations yet</p>
                <p className="text-sm mt-1">Start a new chat!</p>
              </div>
            ) : (
              [...conversations]
                .sort((a, b) => {
                  const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
                  const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
                  return timeB - timeA
                })
                .map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={currentConversation?.id === conv.id}
                    onClick={() => handleConversationClick(conv.id)}
                  />
                ))
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white chat-pattern">
        {tempChatUser && !currentConversation ? (
          <>
            <ChatHeader conversation={undefined} />
            
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center px-4 animate-fadeIn">
                <Avatar
                  name={tempChatUser.username || tempChatUser.fullName || ''}
                  size="xl"
                  className="mx-auto mb-4"
                />
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  {tempChatUser.fullName || tempChatUser.username}
                </h3>
                <p className="text-gray-600 mb-6">
                  Send a message to start chatting
                </p>
              </div>
            </div>

            <div className="border-t backdrop-blur-sm bg-white/95 p-4 shadow-lg">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your first message..."
                  className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  disabled={isCreatingConversation}
                />
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || isCreatingConversation}
                  isLoading={isCreatingConversation}
                  className="rounded-xl px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </Button>
              </form>
            </div>
          </>
        ) : currentConversation ? (
          <>
            <ChatHeader conversation={currentConversation} />

            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
              {messages
                .slice()
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwnMessage={message.senderId === user?.id}
                  />
                ))}
              {(() => {
                const count = typingUsers.size
                console.log('🎨 Rendering typing indicator check:', { 
                  count, 
                  users: Array.from(typingUsers),
                  typingUsersObj: typingUsers 
                })
                return count > 0 ? <TypingIndicator count={count} /> : null
              })()}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t backdrop-blur-sm bg-white/95 p-4 shadow-lg">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                />
                <Button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="rounded-xl px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-fadeIn">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full blur-2xl opacity-20 animate-pulse-slow"></div>
                <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Chat</h3>
              <p className="text-gray-600 mb-4">Select a conversation to start chatting</p>
              <p className="text-sm text-gray-500">or create a new one by clicking the <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded font-bold text-xs">+</span> button</p>
            </div>
          </div>
        )}
      </div>

      <ProfileEditModal
        isOpen={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
      />
    </div>
  )
}
