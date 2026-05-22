import { useEffect } from 'react'
import { relationshipService, useFriendsManagementStore, FriendsTab } from '@chat/shared'
import { Button } from '../../../common'
import { UserRow } from '../UserRow'
import { Spinner, EmptyState } from '../shared'
import { useRowAction } from '../useRowAction'

interface Props {
  onOpenProfile: (userId: string) => void
}

export const RequestsTabPanel = ({ onOpenProfile }: Props) => {
  const slice = useFriendsManagementStore((s) => s.requests)
  const loadTab = useFriendsManagementStore((s) => s.loadTab)
  const { run, isPending, anyPending } = useRowAction()

  useEffect(() => {
    loadTab(FriendsTab.REQUESTS)
  }, [loadTab])

  if (slice.loading && slice.items.length === 0) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }
  if (slice.items.length === 0) {
    return <EmptyState text="No pending requests" subtitle="Friend requests sent to you will appear here." />
  }

  return (
    <div className="space-y-0.5">
      {slice.items.map((r) => {
        const u = r.requester
        if (!u) return null
        return (
          <UserRow
            key={r.id}
            avatar={u.avatar}
            name={u.fullName || u.username}
            username={u.username}
            onClick={() => onOpenProfile(u.id)}
            actions={
              <>
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={isPending(`${r.id}:accept`)}
                  disabled={anyPending && !isPending(`${r.id}:accept`)}
                  onClick={() => run(`${r.id}:accept`, () => relationshipService.respondToRequest(r.id, 'accept'))}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  isLoading={isPending(`${r.id}:reject`)}
                  disabled={anyPending && !isPending(`${r.id}:reject`)}
                  onClick={() => run(`${r.id}:reject`, () => relationshipService.respondToRequest(r.id, 'reject'))}
                >
                  Reject
                </Button>
              </>
            }
          />
        )
      })}
    </div>
  )
}
