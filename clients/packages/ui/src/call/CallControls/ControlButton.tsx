import type { ReactNode } from 'react'
import { permDotColor } from './permission.utils'
import type { PermState } from '../interfaces'

interface ControlButtonProps {
  active: boolean
  title: string
  onClick: () => void
  children: ReactNode
  perm?: PermState
  glowLevel?: number
}

export const ControlButton = ({ active, title, onClick, children, perm, glowLevel = 0 }: ControlButtonProps) => {
  const dotColor = perm ? permDotColor(perm) : null
  const strength = Math.min(1, glowLevel * 2.5)
  const borderWidth = strength * 4
  return (
    <button
      onClick={onClick}
      title={title}
      style={
        strength > 0.02
          ? {
              boxShadow: `0 0 0 ${borderWidth}px rgba(134,239,172,1)`,
              transition: 'box-shadow 80ms ease-out',
            }
          : undefined
      }
      className={[
        'relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-fast ease-ease-bounce hover:scale-110 active:scale-95 backdrop-blur-sm',
        active ? 'bg-white text-slate-900' : 'bg-white/15 hover:bg-white/25 text-white',
      ].join(' ')}
    >
      {children}
      {dotColor && (
        <span className={`absolute top-0.5 right-0.5 w-3 h-3 rounded-full ring-2 ring-slate-900 ${dotColor}`} />
      )}
    </button>
  )
}
