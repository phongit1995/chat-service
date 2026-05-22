import { useMicLevel } from '../hooks/useMicLevel'
import { MicIcon, MicOffIcon } from '../icons'
import { MicLiveIcon } from '../MicLiveIcon'
import { permDotColor } from './permission.utils'
import type { PermState } from '../interfaces'

interface MicControlButtonProps {
  micMuted: boolean
  micBands: ReturnType<typeof useMicLevel>
  title: string
  onClick: () => void
  perm: PermState
}

export const MicControlButton = ({ micMuted, micBands, title, onClick, perm }: MicControlButtonProps) => {
  const dotColor = permDotColor(perm)
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        'relative h-12 sm:h-14 rounded-full flex items-center justify-center gap-3 sm:gap-4 px-4 sm:px-5 transition-colors duration-fast hover:scale-105 active:scale-95 backdrop-blur-sm',
        micMuted ? 'bg-white text-slate-900' : 'bg-white/15 hover:bg-white/25 text-white',
      ].join(' ')}
    >
      {micMuted ? (
        <MicOffIcon />
      ) : (
        <>
          <MicLiveIcon bands={micBands} className="w-4 h-5" />
          <MicIcon />
        </>
      )}
      {dotColor && (
        <span className={`absolute top-0.5 right-0.5 w-3 h-3 rounded-full ring-2 ring-slate-900 ${dotColor}`} />
      )}
    </button>
  )
}
