export const formatLastActive = (iso?: string): string => {
  if (!iso) return 'Offline'
  const t = new Date(iso).getTime()
  if (isNaN(t)) return 'Offline'

  const diffMs = Date.now() - t
  if (diffMs < 0) return 'Active just now'

  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return 'Active just now'

  const min = Math.floor(sec / 60)
  if (min < 60) return `Active ${min}m ago`

  const hr = Math.floor(min / 60)
  if (hr < 24) return `Active ${hr}h ago`

  return 'Offline'
}
