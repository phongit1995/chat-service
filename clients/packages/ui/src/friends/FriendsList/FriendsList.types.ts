import type { Friend } from '@chat/shared'

export interface FriendsListProps {
  friends: Friend[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  total: number
  onLoadMore: () => void
  onStartChat: (userId: string) => void
  onOpenProfile: (userId: string) => void
}

export interface FriendItemProps {
  friend: Friend
  onStartChat: (userId: string) => void
  onOpenProfile: (userId: string) => void
}
