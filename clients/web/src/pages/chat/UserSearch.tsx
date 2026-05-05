import { useState, useRef, ChangeEvent } from 'react'
import { Avatar } from '../../components/ui'
import { apiService } from '../../services/api'
import type { UserSearchResult } from '../../types'

interface UserSearchProps {
  show: boolean
  onSelectUser: (user: UserSearchResult) => void
}

export const UserSearch = ({ show, onSelectUser }: UserSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleSelectUser = (result: UserSearchResult) => {
    onSelectUser(result)
    setSearchQuery('')
    setSearchResults([])
  }

  if (!show) return null

  return (
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
  )
}