import { useEffect } from 'react'
import { useCallStore, peerDisplayName } from '../../store/callStore'
import { useDraggable } from '../../hooks/useDraggable'
import { Avatar } from '../ui'
import { PhoneIcon, VideoIcon } from './icons'

export const IncomingCallModal = () => {
  const { mode, incoming, answerIncoming, declineIncoming, incomingPos, setIncomingPos } = useCallStore()
  const { dragStyle, dragHandleProps, nodeRef } = useDraggable({
    initialRight: 24,
    initialTop: 24,
    position: incomingPos,
    onChange: setIncomingPos,
  })

  useEffect(() => {
    if (mode !== 'incoming') return
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const ring = () => {
      const now = ctx.currentTime
      ;[0, 0.4].forEach((offset) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = 440
        osc.connect(gain)
        gain.connect(ctx.destination)
        gain.gain.setValueAtTime(0, now + offset)
        gain.gain.linearRampToValueAtTime(0.06, now + offset + 0.02)
        gain.gain.linearRampToValueAtTime(0, now + offset + 0.35)
        osc.start(now + offset)
        osc.stop(now + offset + 0.35)
      })
    }
    ring()
    const interval = setInterval(ring, 1500)
    return () => {
      clearInterval(interval)
      ctx.close().catch(() => {})
    }
  }, [mode])

  if (mode !== 'incoming' || !incoming) return null

  const name = peerDisplayName(incoming.caller)
  const isVideo = incoming.callType === 'video'

  return (
    <div
      ref={nodeRef}
      style={{ ...dragStyle, zIndex: 10000 }}
      className="w-[340px] animate-slideInRight"
    >
      <div className="relative bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl shadow-2xl ring-1 ring-white/10 overflow-hidden select-none">
        <div className="absolute inset-0 bg-gradient-signature opacity-10 pointer-events-none" />

        <div
          {...dragHandleProps}
          className="relative px-4 pt-4 pb-2 flex items-center gap-2 cursor-grab active:cursor-grabbing"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/80 flex-1">
            Incoming {isVideo ? 'video' : 'voice'} call
          </p>
          <svg
            className="w-3.5 h-3.5 text-white/40 shrink-0"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <rect x="3" y="4" width="2" height="2" rx="1" />
            <rect x="7" y="4" width="2" height="2" rx="1" />
            <rect x="11" y="4" width="2" height="2" rx="1" />
            <rect x="3" y="8" width="2" height="2" rx="1" />
            <rect x="7" y="8" width="2" height="2" rx="1" />
            <rect x="11" y="8" width="2" height="2" rx="1" />
            <rect x="3" y="12" width="2" height="2" rx="1" />
            <rect x="7" y="12" width="2" height="2" rx="1" />
            <rect x="11" y="12" width="2" height="2" rx="1" />
          </svg>
        </div>

        <div className="relative px-5 pb-5 flex flex-col items-center text-white">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-signature opacity-40 blur-xl animate-pulse" />
            <div className="absolute inset-0 rounded-full ring-2 ring-white/30 animate-ping" />
            <div className="relative">
              <Avatar src={incoming.caller.avatar} name={name} size="xl" />
            </div>
          </div>

          <h2 className="text-xl font-semibold leading-tight text-white text-center">
            {name}
          </h2>
          {incoming.caller.username ? (
            <p className="text-white/60 text-sm mt-1 mb-5">@{incoming.caller.username}</p>
          ) : (
            <div className="mb-5" />
          )}

          <div className="flex items-center gap-10">
            <AnswerButton variant="decline" onClick={declineIncoming} label="Decline">
              <PhoneIcon className="w-6 h-6 text-white rotate-[135deg]" />
            </AnswerButton>

            <AnswerButton variant="accept" onClick={answerIncoming} label="Accept">
              {isVideo
                ? <VideoIcon className="w-6 h-6 text-white" />
                : <PhoneIcon className="w-6 h-6 text-white" />}
            </AnswerButton>
          </div>
        </div>
      </div>
    </div>
  )
}

interface AnswerButtonProps {
  variant: 'accept' | 'decline'
  onClick: () => void
  label: string
  children: React.ReactNode
}

const AnswerButton = ({ variant, onClick, label, children }: AnswerButtonProps) => {
  const isAccept = variant === 'accept'
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-1">
      <span
        className={[
          'w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform duration-fast ease-ease-bounce group-hover:scale-110 group-active:scale-95',
          isAccept
            ? 'bg-green-500 hover:bg-green-600 shadow-green-500/50 animate-pulse'
            : 'bg-red-500 hover:bg-red-600 shadow-red-500/50',
        ].join(' ')}
      >
        {children}
      </span>
      <span className="text-xs font-medium text-white/90 mt-0.5">{label}</span>
    </button>
  )
}
