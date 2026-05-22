export const formatConversationTime = (dateString?: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const diffMs = Date.now() - date.getTime()
  const m = Math.floor(diffMs / 60000)
  const h = Math.floor(diffMs / 3600000)
  const d = Math.floor(diffMs / 86400000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  if (d < 7) return `${d}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
