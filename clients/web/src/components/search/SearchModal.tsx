import { useEffect, useRef } from 'react'
import { Avatar, Modal } from '../ui'
import type { Conversation, UserSearchResult } from '../../types'
import { useConversationSearch, type SearchResultRow } from './useConversationSearch'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  conversations: Conversation[]
  onSelectUser: (user: UserSearchResult) => void
  onSelectConversation: (conversationId: string) => void
}

const highlight = (text: string, query: string) => {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary-100 text-primary-700 rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export const SearchModal = ({
  isOpen,
  onClose,
  conversations,
  onSelectUser,
  onSelectConversation,
}: SearchModalProps) => {
  const {
    activeIndex,
    filteredConvs,
    isSearching,
    query,
    rows,
    setActiveIndex,
    setQuery,
    showEmpty,
    users,
  } = useConversationSearch({ isOpen, conversations })
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const commitRow = (row: SearchResultRow) => {
    if (row.kind === 'conversation') {
      onSelectConversation(row.conv.id)
    } else {
      onSelectUser(row.user)
    }
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (rows.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % rows.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + rows.length) % rows.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commitRow(rows[activeIndex])
    }
  }

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="spotlight" ariaLabel="Search">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-line-subtle">
        <svg className="w-5 h-5 text-ink-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search people, conversations..."
          className="flex-1 bg-transparent outline-none text-ink-primary placeholder:text-ink-tertiary text-base"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="p-1 rounded-full text-ink-tertiary hover:bg-surface-overlay hover:text-ink-primary transition-colors"
            aria-label="Clear"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono text-ink-tertiary bg-surface-overlay border border-line rounded">
          esc
        </kbd>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {query.trim().length < 2 && (
          <div className="px-5 py-10 text-center text-sm text-ink-tertiary">
            <p className="mb-2">Type at least 2 characters to search.</p>
            <p className="text-xs">
              <kbd className="px-1.5 py-0.5 bg-surface-overlay border border-line rounded text-[10px]">↑</kbd>
              {' '}
              <kbd className="px-1.5 py-0.5 bg-surface-overlay border border-line rounded text-[10px]">↓</kbd>
              {' '}to navigate{' '}
              <kbd className="px-1.5 py-0.5 bg-surface-overlay border border-line rounded text-[10px]">↵</kbd>
              {' '}to select
            </p>
          </div>
        )}

        {isSearching && rows.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-ink-tertiary">Searching...</div>
        )}

        {filteredConvs.length > 0 && (
          <div className="py-2">
            <div className="px-5 py-1 text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">
              Conversations
            </div>
            {filteredConvs.map((conv, i) => {
              const idx = i
              const isActive = idx === activeIndex
              return (
                <button
                  key={`conv-${conv.id}`}
                  data-index={idx}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => commitRow({ kind: 'conversation', conv })}
                  className={`w-full px-5 py-2.5 flex items-center gap-3 text-left transition-colors ${
                    isActive ? 'bg-surface-overlay' : 'hover:bg-surface-elevated'
                  }`}
                >
                  <Avatar name={conv.name || 'Conversation'} src={conv.avatar} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink-primary truncate text-sm">
                      {highlight(conv.name || 'Conversation', query)}
                    </div>
                    {conv.lastMessageText && (
                      <div className="text-xs text-ink-tertiary truncate">
                        {highlight(conv.lastMessageText, query)}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-ink-tertiary uppercase font-semibold">{conv.type}</span>
                </button>
              )
            })}
          </div>
        )}

        {users.length > 0 && (
          <div className="py-2 border-t border-line-subtle">
            <div className="px-5 py-1 text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">
              People
            </div>
            {users.map((user, i) => {
              const idx = filteredConvs.length + i
              const isActive = idx === activeIndex
              return (
                <button
                  key={`user-${user.id}`}
                  data-index={idx}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => commitRow({ kind: 'user', user })}
                  className={`w-full px-5 py-2.5 flex items-center gap-3 text-left transition-colors ${
                    isActive ? 'bg-surface-overlay' : 'hover:bg-surface-elevated'
                  }`}
                >
                  <Avatar name={user.fullName || user.username} src={user.avatar} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink-primary truncate text-sm">
                      {highlight(user.fullName || user.username, query)}
                    </div>
                    <div className="text-xs text-ink-tertiary truncate">
                      @{highlight(user.username, query)}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {showEmpty && (
          <div className="px-5 py-10 text-center text-sm text-ink-tertiary">
            <svg className="w-12 h-12 mx-auto mb-3 text-ink-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <p className="font-medium text-ink-primary">No results for "{query.trim()}"</p>
            <p className="text-xs mt-1">Try a different name or username</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
