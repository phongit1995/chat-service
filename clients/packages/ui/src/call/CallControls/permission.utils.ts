import { PERM_STATE } from '../constants'
import type { PermState } from '../interfaces'

export const permTitle = (label: string, perm: PermState, base: string): string => {
  if (perm === PERM_STATE.DENIED) return `${label} blocked — change in browser settings`
  if (perm === PERM_STATE.PROMPT) return `${label} not yet allowed`
  return base
}

export const permDotColor = (perm: PermState): string | null => {
  if (perm === PERM_STATE.DENIED) return 'bg-red-500'
  if (perm === PERM_STATE.GRANTED) return 'bg-green-500'
  if (perm === PERM_STATE.PROMPT) return 'bg-amber-400'
  return null
}
