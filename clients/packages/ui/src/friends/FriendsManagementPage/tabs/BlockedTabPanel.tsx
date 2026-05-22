import { useEffect } from 'react'
import { relationshipService, useFriendsManagementStore, FriendsTab } from '@chat/shared'
import { Button } from '../../../common'
import { UserRow } from '../UserRow'
import { Spinner, EmptyState } from '../shared'
import { useRowAction } from '../useRowAction'

interface Props {
  onOpenProfile: (userId: string) => void
}

export const BlockedTabPanel = ({ onOpenProfile }: Props) => {
  const slice = useFriendsManagementStore((s) => s.blocked)
  const loadTab = useFriendsManagementStore((s) => s.loadTab)
  const { run, isPending, anyPending } = useRowAction()

  useEffect(() => {
    loadTab(FriendsTab.BLOCKED)
  }, [loadTab])

  if (slice.loading && slice.items.length === 0) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }
  if (slice.items.length === 0) {
    return <EmptyState text="No blocked users" />
  }

  return (
    <div className="space-y-0.5">
      {slice.items.map((r) => {
        const u = r.addressee
        if (!u) return null
        return (
          <UserRow
            key={r.id}
            avatar={u.avatar}
            name={u.fullName || u.username}
            username={u.username}
            onClick={() => onOpenProfile(u.id)}
            actions={
              <Button
                size="sm"
                variant="secondary"
                isLoading={isPending(r.id)}
                disabled={anyPending && !isPending(r.id)}
                onClick={() => run(r.id, () => relationshipService.unblock(r.id))}
              >
                Unblock
              </Button>
            }
          />
        )
      })}
    </div>
  )
}
