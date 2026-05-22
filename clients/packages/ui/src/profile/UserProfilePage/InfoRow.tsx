import type { ReactNode } from 'react'

interface InfoRowProps {
  icon: ReactNode
  label: string
  value: string
}

export const InfoRow = ({ icon, label, value }: InfoRowProps) => (
  <div className="flex items-center gap-3 px-4 py-3">
    <span className="text-ink-tertiary flex-shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs text-ink-tertiary font-medium">{label}</p>
      <p className="text-sm text-ink-primary truncate">{value}</p>
    </div>
  </div>
)
