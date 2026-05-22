import { create } from 'zustand'
import { userService } from '../services/user.service'
import { relationshipService } from '../services/relationship.service'
import { useFriendsStore } from './friendsStore'
import type { UserPublicProfile } from '../types'

export const ProfileAction = {
  SEND: 'send',
  ACCEPT: 'accept',
  REJECT: 'reject',
  CANCEL: 'cancel',
  UNFRIEND: 'unfriend',
  BLOCK: 'block',
  UNBLOCK: 'unblock',
} as const

export type ProfileAction = (typeof ProfileAction)[keyof typeof ProfileAction]

interface UserProfileState {
  userId: string | null
  profile: UserPublicProfile | null
  loading: boolean
  error: string | null
  pendingAction: string | null

  load: (userId: string) => Promise<void>
  refetch: () => Promise<void>
  reset: () => void
  runAction: (key: ProfileAction, fn: () => Promise<unknown>) => Promise<void>

  sendRequest: () => void
  accept: () => void
  reject: () => void
  cancel: () => void
  unfriend: () => void
  block: () => void
  unblock: () => void
}

export const useUserProfileStore = create<UserProfileState>((set, get) => ({
  userId: null,
  profile: null,
  loading: false,
  error: null,
  pendingAction: null,

  reset: () => {
    set({ userId: null, profile: null, loading: false, error: null, pendingAction: null })
  },

  load: async (userId) => {
    set({ userId, loading: true, error: null, profile: null })
    try {
      const res = await userService.getUserInfo(userId)
      if (get().userId !== userId) return
      set({ profile: res.data ?? null, loading: false })
    } catch {
      if (get().userId !== userId) return
      set({ error: 'Failed to load profile', loading: false })
    }
  },

  refetch: async () => {
    const { userId } = get()
    if (!userId) return
    const res = await userService.getUserInfo(userId)
    if (get().userId !== userId) return
    set({ profile: res.data ?? null })
  },

  runAction: async (key, fn) => {
    set({ pendingAction: key })
    try {
      await fn()
      await get().refetch()
      if (useFriendsStore.getState().loaded) {
        useFriendsStore.getState().refresh()
      }
    } catch (err) {
      console.error('relationship action failed', err)
      alert('Action failed. Please try again.')
    } finally {
      set({ pendingAction: null })
    }
  },

  sendRequest: () => {
    const { userId, runAction } = get()
    if (!userId) return
    runAction(ProfileAction.SEND, () => relationshipService.sendRequest(userId))
  },

  accept: () => {
    const requestId = get().profile?.relationship?.requestId
    if (!requestId) return
    get().runAction(ProfileAction.ACCEPT, () => relationshipService.respondToRequest(requestId, 'accept'))
  },

  reject: () => {
    const requestId = get().profile?.relationship?.requestId
    if (!requestId) return
    get().runAction(ProfileAction.REJECT, () => relationshipService.respondToRequest(requestId, 'reject'))
  },

  cancel: () => {
    const requestId = get().profile?.relationship?.requestId
    if (!requestId) return
    get().runAction(ProfileAction.CANCEL, () => relationshipService.cancelRequest(requestId))
  },

  unfriend: () => {
    const requestId = get().profile?.relationship?.requestId
    if (!requestId) return
    if (!confirm('Unfriend this user?')) return
    get().runAction(ProfileAction.UNFRIEND, () => relationshipService.unfriend(requestId))
  },

  block: () => {
    const { userId } = get()
    if (!userId) return
    if (!confirm('Block this user? You will no longer see their messages.')) return
    get().runAction(ProfileAction.BLOCK, () => relationshipService.block(userId))
  },

  unblock: () => {
    const requestId = get().profile?.relationship?.requestId
    if (!requestId) return
    get().runAction(ProfileAction.UNBLOCK, () => relationshipService.unblock(requestId))
  },
}))
