import { create } from 'zustand'
import { relationshipService } from '../services/relationship.service'
import type { RelationshipResponse } from '../services/relationship.service'
import type { Friend } from '../types'
import { useFriendsStore } from './friendsStore'

export const FriendsTab = {
  FRIENDS: 'friends',
  REQUESTS: 'requests',
  SENT: 'sent',
  BLOCKED: 'blocked',
} as const

export type FriendsTab = (typeof FriendsTab)[keyof typeof FriendsTab]

interface ListSlice<T> {
  items: T[]
  total: number
  offset: number
  loading: boolean
  loaded: boolean
  error: string | null
}

const emptySlice = <T>(): ListSlice<T> => ({
  items: [],
  total: 0,
  offset: 0,
  loading: false,
  loaded: false,
  error: null,
})

interface FriendsManagementState {
  activeTab: FriendsTab
  friends: ListSlice<Friend>
  requests: ListSlice<RelationshipResponse>
  sent: ListSlice<RelationshipResponse>
  blocked: ListSlice<RelationshipResponse>

  setActiveTab: (t: FriendsTab) => void
  loadTab: (t: FriendsTab, force?: boolean) => Promise<void>
  refreshTab: (t: FriendsTab) => Promise<void>
  refreshAll: () => Promise<void>
  refreshCounts: () => Promise<void>
  reset: () => void
}

const PAGE_SIZE = 50

export const useFriendsManagementStore = create<FriendsManagementState>((set, get) => {
  const fetchFor = async (tab: FriendsTab) => {
    if (tab === FriendsTab.FRIENDS) {
      const res = await relationshipService.getFriends(PAGE_SIZE, 0)
      return {
        items: res.data?.friends ?? [],
        total: res.data?.total ?? 0,
      }
    }
    const fn =
      tab === FriendsTab.REQUESTS ? relationshipService.getPendingRequests
      : tab === FriendsTab.SENT ? relationshipService.getSentRequests
      : relationshipService.getBlockedUsers
    const res = await fn(PAGE_SIZE, 0)
    return {
      items: res.data?.relationships ?? [],
      total: res.data?.total ?? 0,
    }
  }

  const sliceKey = (t: FriendsTab) =>
    t === FriendsTab.FRIENDS ? 'friends'
    : t === FriendsTab.REQUESTS ? 'requests'
    : t === FriendsTab.SENT ? 'sent' : 'blocked'

  return {
    activeTab: FriendsTab.FRIENDS,
    friends: emptySlice<Friend>(),
    requests: emptySlice<RelationshipResponse>(),
    sent: emptySlice<RelationshipResponse>(),
    blocked: emptySlice<RelationshipResponse>(),

    setActiveTab: (t) => set({ activeTab: t }),

    loadTab: async (t, force = false) => {
      const key = sliceKey(t)
      const current = get()[key] as ListSlice<unknown>
      if (current.loading) return
      if (current.loaded && !force) return
      set({ [key]: { ...current, loading: true, error: null } } as Partial<FriendsManagementState>)
      try {
        const { items, total } = await fetchFor(t)
        set({
          [key]: {
            items,
            total,
            offset: items.length,
            loading: false,
            loaded: true,
            error: null,
          },
        } as Partial<FriendsManagementState>)
      } catch {
        set({
          [key]: { ...current, loading: false, error: 'Failed to load' },
        } as Partial<FriendsManagementState>)
      }
    },

    refreshTab: async (t) => {
      await get().loadTab(t, true)
    },

    refreshAll: async () => {
      await Promise.all([
        get().refreshTab(FriendsTab.FRIENDS),
        get().refreshTab(FriendsTab.REQUESTS),
        get().refreshTab(FriendsTab.SENT),
        get().refreshTab(FriendsTab.BLOCKED),
      ])
    },

    refreshCounts: async () => {
      try {
        const [pending] = await Promise.all([
          relationshipService.getPendingRequests(1, 0),
        ])
        const cur = get().requests
        set({
          requests: { ...cur, total: pending.data?.total ?? 0 },
        })
      } catch {}
    },

    reset: () => {
      set({
        activeTab: FriendsTab.FRIENDS,
        friends: emptySlice<Friend>(),
        requests: emptySlice<RelationshipResponse>(),
        sent: emptySlice<RelationshipResponse>(),
        blocked: emptySlice<RelationshipResponse>(),
      })
    },
  }
})

export async function refreshFriendsManagementAfterAction() {
  const store = useFriendsManagementStore.getState()
  const tasks: Promise<void>[] = []
  if (store.friends.loaded) tasks.push(store.refreshTab(FriendsTab.FRIENDS))
  if (store.requests.loaded) tasks.push(store.refreshTab(FriendsTab.REQUESTS))
  if (store.sent.loaded) tasks.push(store.refreshTab(FriendsTab.SENT))
  if (store.blocked.loaded) tasks.push(store.refreshTab(FriendsTab.BLOCKED))
  if (!store.requests.loaded) tasks.push(store.refreshCounts())
  if (useFriendsStore.getState().loaded) tasks.push(useFriendsStore.getState().refresh())
  await Promise.all(tasks)
}
