import { useState } from 'react'
import toast from 'react-hot-toast'
import { refreshFriendsManagementAfterAction } from '@chat/shared'

export function useRowAction() {
  const [pendingId, setPendingId] = useState<string | null>(null)

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setPendingId(id)
    try {
      await fn()
      await refreshFriendsManagementAfterAction()
    } catch {
      toast.error('Action failed. Please try again.')
    } finally {
      setPendingId(null)
    }
  }

  return { pendingId, run, isPending: (id: string) => pendingId === id, anyPending: pendingId !== null }
}
