import { create } from 'zustand'
import { relationshipService } from '../services/relationship.service'
import type { Friend } from '../types'

interface FriendsState {
  friends: Friend[]
  total: number
  limit: number
  offset: number
  loading: boolean
  loadingMore: boolean
  error: string | null
  loaded: boolean

  load: () => Promise<void>
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  reset: () => void
}

const PAGE_SIZE = 50

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  total: 0,
  limit: PAGE_SIZE,
  offset: 0,
  loading: false,
  loadingMore: false,
  error: null,
  loaded: false,

  load: async () => {
    if (get().loading) return
    set({ loading: true, error: null })
    try {
      const res = await relationshipService.getFriends(PAGE_SIZE, 0)
      const data = res.data
      set({
        friends: data?.friends ?? [],
        total: data?.total ?? 0,
        limit: data?.limit ?? PAGE_SIZE,
        offset: data?.friends?.length ?? 0,
        loading: false,
        loaded: true,
      })
    } catch {
      set({ error: 'Failed to load friends', loading: false })
    }
  },

  loadMore: async () => {
    const { offset, total, loadingMore, friends } = get()
    if (loadingMore || friends.length >= total) return
    set({ loadingMore: true })
    try {
      const res = await relationshipService.getFriends(PAGE_SIZE, offset)
      const data = res.data
      const next = data?.friends ?? []
      set({
        friends: [...friends, ...next],
        offset: offset + next.length,
        total: data?.total ?? total,
        loadingMore: false,
      })
    } catch {
      set({ loadingMore: false })
    }
  },

  refresh: async () => {
    try {
      const res = await relationshipService.getFriends(PAGE_SIZE, 0)
      const data = res.data
      set({
        friends: data?.friends ?? [],
        total: data?.total ?? 0,
        offset: data?.friends?.length ?? 0,
        loaded: true,
      })
    } catch {
    }
  },

  reset: () => {
    set({ friends: [], total: 0, offset: 0, loading: false, loadingMore: false, error: null, loaded: false })
  },
}))
