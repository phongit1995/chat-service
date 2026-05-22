import { Avatar } from '../../common'
import { formatLastActive } from '../../profile/UserProfilePage/profile.utils'
import type { FriendItemProps } from './FriendsList.types'

export const FriendItem = ({ friend, onStartChat, onOpenProfile }: FriendItemProps) => {
  const displayName = friend.fullName || friend.username
  const subtitle = friend.isOnline
    ? 'Online'
    : friend.lastActiveAt
      ? `Active ${formatLastActive(friend.lastActiveAt)}`
      : `@${friend.username}`

  return (
    <div className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-overlay transition-colors">
      <button onClick={() => onOpenProfile(friend.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <Avatar
          src={friend.avatar}
          name={displayName}
          size="lg"
          status={friend.isOnline ? 'online' : undefined}
        />
        <div className="flex-1 min-w-0">
          <h4 className="truncate font-semibold text-ink-primary">{displayName}</h4>
          <p
            className={[
              'text-[12px] truncate',
              friend.isOnline ? 'text-status-success' : 'text-ink-tertiary',
            ].join(' ')}
          >
            {subtitle}
          </p>
        </div>
      </button>
      <button
        onClick={() => onStartChat(friend.id)}
        className="flex-shrink-0 p-2 rounded-full text-primary-500 hover:bg-primary-500/10 transition-colors"
        title="Send message"
        aria-label="Send message"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    </div>
  )
}
