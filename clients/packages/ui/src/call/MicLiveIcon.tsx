interface MicLiveIconProps {
  level: number
  className?: string
}

const MIN_H = 4
const MAX_H = 20

const shape = (level: number, weight: number) => {
  const boosted = Math.min(1, Math.pow(level * 6, 0.7) * weight)
  return MIN_H + (MAX_H - MIN_H) * boosted
}

export const MicLiveIcon = ({ level, className = 'w-4 h-6' }: MicLiveIconProps) => {
  const h1 = shape(level, 0.75)
  const h2 = shape(level, 1.0)
  const h3 = shape(level, 0.75)
  return (
    <svg viewBox="0 0 14 24" className={className} fill="none" preserveAspectRatio="xMidYMid meet">
      <rect
        x="0.5"
        y={12 - h1 / 2}
        width="3"
        height={h1}
        rx="1.5"
        fill="currentColor"
        style={{ transition: 'height 90ms ease-out, y 90ms ease-out' }}
      />
      <rect
        x="5.5"
        y={12 - h2 / 2}
        width="3"
        height={h2}
        rx="1.5"
        fill="currentColor"
        style={{ transition: 'height 90ms ease-out, y 90ms ease-out' }}
      />
      <rect
        x="10.5"
        y={12 - h3 / 2}
        width="3"
        height={h3}
        rx="1.5"
        fill="currentColor"
        style={{ transition: 'height 90ms ease-out, y 90ms ease-out' }}
      />
    </svg>
  )
}
