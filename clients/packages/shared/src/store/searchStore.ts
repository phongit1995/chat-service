import { create } from 'zustand'
import { userService } from '../services/user.service'
import type { Conversation, UserSearchResult } from '../types'

interface SearchState {
  query: string
  users: UserSearchResult[]
  isSearching: boolean
  activeIndex: number
  abortController: AbortController | null
  debounceTimer: ReturnType<typeof setTimeout> | null

  setQuery: (q: string) => void
  setActiveIndex: (i: number | ((prev: number) => number)) => void
  reset: () => void
  runSearch: (q: string) => Promise<void>
  filterConversations: (conversations: Conversation[]) => Conversation[]
}

const SEARCH_DEBOUNCE_MS = 250
const SEARCH_MIN_CHARS = 2
const SEARCH_LIMIT = 20
const MAX_LOCAL_CONV_RESULTS = 6

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  users: [],
  isSearching: false,
  activeIndex: 0,
  abortController: null,
  debounceTimer: null,

  setActiveIndex: (i) => {
    set((s) => ({ activeIndex: typeof i === 'function' ? i(s.activeIndex) : i }))
  },

  setQuery: (q) => {
    const { debounceTimer, abortController, runSearch } = get()
    if (debounceTimer) clearTimeout(debounceTimer)
    abortController?.abort()

    set({ query: q })

    if (q.trim().length < SEARCH_MIN_CHARS) {
      set({ users: [], isSearching: false, debounceTimer: null, abortController: null })
      return
    }

    set({ isSearching: true })
    const timer = setTimeout(() => runSearch(q.trim()), SEARCH_DEBOUNCE_MS)
    set({ debounceTimer: timer })
  },

  runSearch: async (q) => {
    const controller = new AbortController()
    set({ abortController: controller })
    try {
      const response = await userService.searchUsers(q, SEARCH_LIMIT, controller.signal)
      if (!controller.signal.aborted) {
        set({ users: response.data?.users || [], isSearching: false })
      }
    } catch {
      if (!controller.signal.aborted) {
        set({ users: [], isSearching: false })
      }
    }
  },

  reset: () => {
    const { debounceTimer, abortController } = get()
    if (debounceTimer) clearTimeout(debounceTimer)
    abortController?.abort()
    set({
      query: '',
      users: [],
      isSearching: false,
      activeIndex: 0,
      debounceTimer: null,
      abortController: null,
    })
  },

  filterConversations: (conversations) => {
    const q = get().query.trim().toLowerCase()
    if (!q) return []
    return conversations
      .filter((c) => {
        const name = (c.name || '').toLowerCase()
        const lastMessage = (c.lastMessageText || '').toLowerCase()
        return name.includes(q) || lastMessage.includes(q)
      })
      .slice(0, MAX_LOCAL_CONV_RESULTS)
  },
}))
