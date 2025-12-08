import { useEffect, useState, FormEvent, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { socketService } from '../services/socket'
import { apiService } from '../services/api'
import type { UserSearchResult, TempChatUser } from '../types'

export const Chat = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const {
    conversations,
    currentConversation,
    messages,
    typingUsers,
    loadConversations,
    selectConversation,
    sendMessage,
  } = useChatStore()

  const [messageInput, setMessageInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [tempChatUser, setTempChatUser] = useState<TempChatUser | null>(null)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleLogout = () => {
    socketService.disconnect()
    logout()
    navigate('/login', { replace: true })
  }

  const handleConversationClick = (conversationId: string) => {
    setTempChatUser(null) // Clear temp user when selecting existing conversation
    selectConversation(conversationId)
  }

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault()
    
    // Handle new user chat (no conversation yet)
    if (tempChatUser && !currentConversation) {
      await handleSendMessageToNewUser()
      return
    }
    
    // Handle existing conversation
    if (!messageInput.trim() || !currentConversation) return

    try {
      await sendMessage(currentConversation.id, messageInput.trim())
      setMessageInput('')
      handleTyping(false)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleTyping = (typing: boolean) => {
    if (!currentConversation) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (typing && !isTyping) {
      setIsTyping(true)
      socketService.sendTyping(currentConversation.id, true)
    }

    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        socketService.sendTyping(currentConversation.id, false)
      }, 2000)
    } else {
      setIsTyping(false)
      socketService.sendTyping(currentConversation.id, false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)
    handleTyping(true)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
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
      // Clear any existing temp user first
      setTempChatUser(null)
      
      // Check if conversation exists
      const response = await apiService.checkDirectConversation(result.id)
      const convData = response.data

      if (convData && convData.id) {
        // Conversation exists, check if it's already in the list
        const existingConv = conversations.find(c => c.id === convData.id)
        
        if (existingConv) {
          // Already in list, just select it
          selectConversation(convData.id)
        } else {
          // Need to reload conversations then select
          await loadConversations()
          selectConversation(convData.id)
        }
      } else {
        // No conversation yet, show temp chat UI
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
      // On error, still show temp chat UI
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
      
      // Send direct message (API will create conversation if needed)
      await apiService.sendDirectMessage(tempChatUser.id, messageInput.trim())
      
      // Reload conversations to get the new one
      await loadConversations()
      
      // Find and select the conversation with this user
      const convResponse = await apiService.checkDirectConversation(tempChatUser.id)
      if (convResponse.data && convResponse.data.id) {
        selectConversation(convResponse.data.id)
      }
      
      // Clear temp state
      setTempChatUser(null)
      setMessageInput('')
    } catch (error) {
      console.error('Failed to send direct message:', error)
    } finally {
      setIsCreatingConversation(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <h2 className="font-semibold text-gray-800">{user?.username}</h2>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="text-gray-500 hover:text-blue-600 transition"
              title="New Chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600 transition"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search users to start chat..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoFocus
            />
            {isSearching && (
              <div className="text-center py-2 text-sm text-gray-500">Searching...</div>
            )}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-64 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectUser(result)}
                    className="w-full p-3 rounded-lg hover:bg-white transition flex items-center text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {result.username?.charAt(0).toUpperCase() || result.fullName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate">
                        {result.fullName || result.username}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">@{result.username}</p>
                      {result.bio && (
                        <p className="text-xs text-gray-500 truncate">{result.bio}</p>
                      )}
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

        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">Conversations</h3>
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No conversations yet</p>
                <p className="text-sm mt-2">Start a new chat!</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleConversationClick(conv.id)}
                  className={`w-full p-3 rounded-lg mb-1 text-left transition ${
                    currentConversation?.id === conv.id
                      ? 'bg-blue-50 border-l-4 border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {conv.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate">
                        {conv.name || `Conversation ${conv.id.slice(0, 8)}`}
                      </h4>
                      {conv.lastMessageText && (
                        <p className="text-sm text-gray-600 truncate">
                          {conv.lastMessageText}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {tempChatUser && !currentConversation ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {tempChatUser.fullName || tempChatUser.username}
              </h2>
              <p className="text-sm text-gray-600">@{tempChatUser.username}</p>
            </div>

            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center px-4">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-3xl font-bold">
                  {tempChatUser.username?.charAt(0).toUpperCase() || tempChatUser.fullName?.charAt(0).toUpperCase() || '?'}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Start conversation with {tempChatUser.fullName || tempChatUser.username}
                </h3>
                <p className="text-gray-600 mb-4">
                  Send a message to start chatting
                </p>
              </div>
            </div>

            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your first message..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={isCreatingConversation}
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || isCreatingConversation}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingConversation ? (
                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : currentConversation ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {currentConversation.name || `Conversation ${currentConversation.id.slice(0, 8)}`}
              </h2>
              <p className="text-sm text-gray-600">{currentConversation.type}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.senderId === user?.id
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      {!isOwnMessage && message.senderName && (
                        <p className="text-xs font-semibold mb-1">{message.senderName}</p>
                      )}
                      <p className="break-words">{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })}
              {typingUsers.size > 0 && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg">
                    <span className="text-sm">Someone is typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Welcome to Chat</h3>
              <p className="text-gray-600">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
