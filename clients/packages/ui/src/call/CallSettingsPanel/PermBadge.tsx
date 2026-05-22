import { PERM_STATE } from '../constants'
import type { PermState } from '../interfaces'

export const PermBadge = ({ perm }: { perm: PermState }) => {
  const color =
    perm === PERM_STATE.GRANTED ? 'bg-green-500'
    : perm === PERM_STATE.DENIED ? 'bg-red-500'
    : perm === PERM_STATE.PROMPT ? 'bg-amber-400'
    : 'bg-slate-500'
  const text =
    perm === PERM_STATE.GRANTED ? 'Allowed'
    : perm === PERM_STATE.DENIED ? 'Blocked'
    : perm === PERM_STATE.PROMPT ? 'Not asked'
    : 'Unsupported'
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-white/70">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {text}
    </span>
  )
}
