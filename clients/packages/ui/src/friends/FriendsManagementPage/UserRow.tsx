import type { ReactNode } from 'react'
import { Avatar } from '../../common'

interface UserRowProps {
  avatar?: string
  name: string
  username?: string
  subtitle?: string
  subtitleColor?: 'default' | 'online'
  status?: 'online'
  onClick?: () => void
  actions: ReactNode
}

export const UserRow = ({
  avatar,
  name,
  username,
  subtitle,
  subtitleColor = 'default',
  status,
  onClick,
  actions,
}: UserRowProps) => {
  const secondaryText = subtitle ?? (username ? `@${username}` : '')
  return (
    <div className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-overlay transition-colors">
      <button
        onClick={onClick}
        disabled={!onClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:cursor-default"
      >
        <Avatar src={avatar} name={name} size="lg" status={status} />
        <div className="flex-1 min-w-0">
          <h4 className="truncate font-semibold text-ink-primary">{name}</h4>
          {secondaryText && (
            <p
              className={[
                'text-[12px] truncate',
                subtitleColor === 'online' ? 'text-status-success' : 'text-ink-tertiary',
              ].join(' ')}
            >
              {secondaryText}
            </p>
          )}
        </div>
      </button>
      <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div>
    </div>
  )
}
