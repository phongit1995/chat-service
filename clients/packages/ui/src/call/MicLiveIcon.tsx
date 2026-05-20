import { useEffect, useRef } from 'react'
import type { MicLevelBands } from './hooks/useMicLevel'

interface MicLiveIconProps {
  bands: MicLevelBands
  muted?: boolean
  className?: string
}

const IDLE_H = 6
const MAX_H = 22
const CENTER = 12

const computeHeight = (level: number): number => {
  if (level < 0.02) return IDLE_H
  return IDLE_H + (MAX_H - IDLE_H) * Math.min(1, level)
}

export const MicLiveIcon = ({ bands, muted = false, className = 'w-5 h-6' }: MicLiveIconProps) => {
  const rectRefs = useRef<(SVGRectElement | null)[]>([null, null, null])
  const speakingRef = useRef(false)
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (muted) return
    const unsub = bands.subscribe((levels) => {
      const refs = rectRefs.current
      let maxLevel = 0
      for (let i = 0; i < 3; i++) {
        const lvl = levels[i] ?? 0
        if (lvl > maxLevel) maxLevel = lvl
        const h = computeHeight(lvl)
        const rect = refs[i]
        if (!rect) continue
        rect.setAttribute('height', String(h))
        rect.setAttribute('y', String(CENTER - h / 2))
      }
      const speaking = maxLevel > 0.04
      if (speaking !== speakingRef.current) {
        speakingRef.current = speaking
        svgRef.current?.style.setProperty('color', speaking ? '#4ade80' : '')
      }
    })
    return unsub
  }, [bands, muted])

  // Initial render uses idle bar height — RAF takes over via subscription.
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 16 24"
      className={className}
      fill="none"
      preserveAspectRatio="xMidYMid meet"
    >
      {[1.5, 6.5, 11.5].map((x, i) => (
        <rect
          key={i}
          ref={(el) => { rectRefs.current[i] = el }}
          x={x}
          y={CENTER - IDLE_H / 2}
          width="3"
          height={IDLE_H}
          rx="1.5"
          fill="currentColor"
        />
      ))}
    </svg>
  )
}
