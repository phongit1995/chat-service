import { useEffect, useState } from 'react'
import { PERM_STATE } from '../constants'
import type { PermName, PermState } from '../interfaces'

export type { PermState }

export function usePermissionStatus(name: PermName): PermState {
  const [state, setState] = useState<PermState>(PERM_STATE.PROMPT)

  useEffect(() => {
    let cancelled = false
    let status: PermissionStatus | null = null
    const onChange = () => {
      if (!cancelled && status) setState(status.state as PermState)
    }

    if (!navigator.permissions?.query) {
      setState(PERM_STATE.UNSUPPORTED)
      return
    }

    navigator.permissions
      .query({ name: name as PermissionName })
      .then((s) => {
        if (cancelled) return
        status = s
        setState(s.state as PermState)
        s.addEventListener('change', onChange)
      })
      .catch(() => {
        if (!cancelled) setState(PERM_STATE.UNSUPPORTED)
      })

    return () => {
      cancelled = true
      status?.removeEventListener('change', onChange)
    }
  }, [name])

  return state
}
