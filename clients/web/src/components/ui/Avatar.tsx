interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'away' | 'busy'
  storyRing?: boolean
  storyRingSeen?: boolean
  className?: string
}

const sizeBox = {
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

const statusColor = {
  online: 'bg-status-success',
  away: 'bg-status-warning',
  busy: 'bg-status-danger',
  offline: 'bg-ink-tertiary',
}

const statusDot = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
}

const initialsOf = (name: string) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const fallbackGradient = (name: string) => {
  const gradients = [
    'from-accent-yellow to-accent-orange',
    'from-accent-orange to-primary-500',
    'from-primary-500 to-accent-purple',
    'from-accent-purple to-accent-blue',
    'from-accent-coral to-primary-500',
  ]
  const code = name.charCodeAt(0) || 0
  return gradients[code % gradients.length]
}

export const Avatar = ({
  src,
  alt,
  name = '',
  size = 'md',
  status,
  storyRing = false,
  storyRingSeen = false,
  className = '',
}: AvatarProps) => {
  const inner = src ? (
    <img
      src={src}
      alt={alt || name}
      className={`${sizeBox[size]} rounded-full object-cover block`}
    />
  ) : (
    <div
      className={`${sizeBox[size]} rounded-full flex items-center justify-center font-semibold text-white bg-gradient-to-br ${fallbackGradient(name)}`}
    >
      {initialsOf(name)}
    </div>
  )

  const ringWrapper = storyRing
    ? `p-[2.5px] rounded-full ${storyRingSeen ? 'bg-line' : 'bg-gradient-signature'}`
    : ''

  return (
    <div className={`relative inline-block ${className}`}>
      {storyRing ? (
        <div className={ringWrapper}>
          <div className="rounded-full p-[2px] bg-surface-base">{inner}</div>
        </div>
      ) : (
        inner
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-surface-base ${statusDot[size]} ${statusColor[status]}`}
        />
      )}
    </div>
  )
}
