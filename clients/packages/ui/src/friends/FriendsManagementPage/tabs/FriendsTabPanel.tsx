import { useEffect } from 'react'
import { useFriendsManagementStore, FriendsTab } from '@chat/shared'
import { Button } from '../../../common'
import { UserRow } from '../UserRow'
import { Spinner, EmptyState } from '../shared'
import { formatLastActive } from '../../../profile/UserProfilePage/profile.utils'

interface Props {
  onStartChat: (userId: string) => void
  onOpenProfile: (userId: string) => void
}

export const FriendsTabPanel = ({ onStartChat, onOpenProfile }: Props) => {
  const slice = useFriendsManagementStore((s) => s.friends)
  const loadTab = useFriendsManagementStore((s) => s.loadTab)

  useEffect(() => {
    loadTab(FriendsTab.FRIENDS)
  }, [loadTab])

  if (slice.loading && slice.items.length === 0) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }
  if (slice.items.length === 0) {
    return <EmptyState text="No friends yet" />
  }

  return (
    <div className="space-y-0.5">
      {slice.items.map((f) => {
        const subtitle = f.isOnline
          ? 'Online'
          : f.lastActiveAt ? formatLastActive(f.lastActiveAt) : `@${f.username}`
        return (
          <UserRow
            key={f.id}
            avatar={f.avatar}
            name={f.fullName || f.username}
            subtitle={subtitle}
            subtitleColor={f.isOnline ? 'online' : 'default'}
            status={f.isOnline ? 'online' : undefined}
            onClick={() => onOpenProfile(f.id)}
            actions={
              <Button size="sm" variant="primary" onClick={() => onStartChat(f.id)}>
                Message
              </Button>
            }
          />
        )
      })}
    </div>
  )
}
