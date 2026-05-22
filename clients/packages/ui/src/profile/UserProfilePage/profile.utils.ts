import type { RelationshipStatus } from '@chat/shared'

export const formatLastActive = (iso: string): string => {
  try {
    const dt = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - dt.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h ago`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `${diffD}d ago`
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export const formatProfileDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export const relationshipLabel = (status: RelationshipStatus): { text: string; color: string } => {
  switch (status) {
    case 'friend':
      return { text: 'Friends', color: 'text-status-success border-status-success/30 bg-status-success/10' }
    case 'pending_outgoing':
      return { text: 'Request sent', color: 'text-ink-secondary border-line bg-surface-overlay' }
    case 'pending_incoming':
      return { text: 'Wants to be friends', color: 'text-primary-500 border-primary-300 bg-primary-50' }
    case 'blocked_by_me':
      return { text: 'Blocked', color: 'text-status-danger border-status-danger/30 bg-status-danger/10' }
    case 'blocked_by_them':
      return { text: 'Unavailable', color: 'text-ink-tertiary border-line bg-surface-overlay' }
    default:
      return { text: '', color: '' }
  }
}
