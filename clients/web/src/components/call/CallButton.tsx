import { useCallStore, type CallerBrief } from '../../store/callStore'
import { PhoneIcon, VideoIcon } from './icons'

interface CallButtonProps {
  conversationId: string
  peer: CallerBrief
  disabled?: boolean
}

export const CallButton = ({ conversationId, peer, disabled }: CallButtonProps) => {
  const { mode, startCall } = useCallStore()
  const busy = mode !== 'idle' || disabled

  return (
    <div className="flex items-center gap-1.5">
      <IconButton
        title="Voice call"
        disabled={busy}
        onClick={() => startCall(conversationId, 'audio', peer)}
      >
        <PhoneIcon />
      </IconButton>
      <IconButton
        title="Video call"
        disabled={busy}
        onClick={() => startCall(conversationId, 'video', peer)}
      >
        <VideoIcon />
      </IconButton>
    </div>
  )
}

interface IconButtonProps {
  title: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

const IconButton = ({ title, disabled, onClick, children }: IconButtonProps) => (
  <button
    title={title}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className="p-2.5 rounded-full text-ink-primary hover:bg-surface-overlay disabled:opacity-40 disabled:cursor-not-allowed transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95"
  >
    {children}
  </button>
)
