import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { userService } from '@chat/shared'
import type { Conversation, UserSearchResult } from '@chat/shared'

export type SearchResultRow =
  | { kind: 'conversation'; conv: Conversation }
  | { kind: 'user'; user: UserSearchResult }

interface UseConversationSearchArgs {
  isOpen: boolean
  conversations: Conversation[]
}

export const useConversationSearch = ({ isOpen, conversations }: UseConversationSearchArgs) => {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setUsers([])
      setActiveIndex(0)
      setIsSearching(false)
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [isOpen])

  const filteredConvs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as Conversation[]
    return conversations
      .filter((conversation) => {
        const name = (conversation.name || '').toLowerCase()
        const lastMessage = (conversation.lastMessageText || '').toLowerCase()
        return name.includes(q) || lastMessage.includes(q)
      })
      .slice(0, 6)
  }, [conversations, query])

  const rows: SearchResultRow[] = useMemo(() => {
    const nextRows: SearchResultRow[] = []
    filteredConvs.forEach((conv) => nextRows.push({ kind: 'conversation', conv }))
    users.forEach((user) => nextRows.push({ kind: 'user', user }))
    return nextRows
  }, [filteredConvs, users])

  useEffect(() => {
    setActiveIndex(0)
  }, [rows.length])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    const q = query.trim()
    if (q.length < 2) {
      setUsers([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const response = await userService.searchUsers(q, 20, controller.signal)
        if (!controller.signal.aborted) {
          setUsers(response.data?.users || [])
        }
      } catch (err) {
        if (!axios.isCancel(err) && !controller.signal.aborted) {
          setUsers([])
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const showEmpty = !isSearching && query.trim().length >= 2 && rows.length === 0

  return {
    activeIndex,
    filteredConvs,
    isSearching,
    query,
    rows,
    setActiveIndex,
    setQuery,
    showEmpty,
    users,
  }
}
