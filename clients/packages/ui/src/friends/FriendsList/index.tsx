import { FriendItem } from './FriendItem'
import type { FriendsListProps } from './FriendsList.types'

export type { FriendsListProps } from './FriendsList.types'

export const FriendsList = ({
  friends,
  loading,
  loadingMore,
  error,
  total,
  onLoadMore,
  onStartChat,
  onOpenProfile,
}: FriendsListProps) => {
  if (loading && friends.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && friends.length === 0) {
    return (
      <div className="text-center py-12 text-ink-tertiary">
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-12 text-ink-tertiary">
        <svg className="w-16 h-16 mx-auto mb-4 text-ink-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <p className="font-medium text-ink-primary">No friends yet</p>
        <p className="text-[13px] mt-1">Search people to send a friend request.</p>
      </div>
    )
  }

  const canLoadMore = friends.length < total

  return (
    <div className="space-y-0.5">
      {friends.map((f) => (
        <FriendItem key={f.id} friend={f} onStartChat={onStartChat} onOpenProfile={onOpenProfile} />
      ))}
      {canLoadMore && (
        <div className="pt-2">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full py-2 text-[13px] text-primary-500 hover:bg-surface-overlay rounded-lg transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
