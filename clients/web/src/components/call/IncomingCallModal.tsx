import { useEffect } from 'react'
import { useCallStore } from '../../store/callStore'
import { Avatar } from '../ui'
import { PhoneIcon, VideoIcon } from './icons'

export const IncomingCallModal = () => {
  const { mode, incoming, answerIncoming, declineIncoming } = useCallStore()

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

  const name = incoming.caller.fullName || incoming.caller.username || 'Unknown caller'
  const isVideo = incoming.callType === 'video'

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-[340px] animate-slideInRight">
      <div className="relative bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl shadow-2xl ring-1 ring-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-signature opacity-10 pointer-events-none" />

        <div className="relative p-5 flex flex-col items-center text-white">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 mb-3 animate-pulse">
            Incoming {isVideo ? 'video' : 'voice'} call
          </p>

          <div className="relative mb-3">
            <div className="absolute inset-0 rounded-full bg-gradient-signature opacity-30 blur-xl animate-pulse" />
            <div className="absolute inset-0 rounded-full ring-2 ring-white/20 animate-ping" />
            <div className="relative">
              <Avatar src={incoming.caller.avatar} name={name} size="xl" />
            </div>
          </div>

          <h2 className="text-lg font-semibold leading-tight">{name}</h2>
          {incoming.caller.username && (
            <p className="text-white/50 text-xs mt-0.5 mb-4">@{incoming.caller.username}</p>
          )}
          {!incoming.caller.username && <div className="mb-4" />}

          <div className="flex items-center gap-6">
            <AnswerButton variant="decline" onClick={declineIncoming} label="Decline">
              <PhoneIcon className="w-5 h-5 text-white rotate-[135deg]" />
            </AnswerButton>

            <AnswerButton variant="accept" onClick={answerIncoming} label="Accept">
              {isVideo
                ? <VideoIcon className="w-5 h-5 text-white" />
                : <PhoneIcon className="w-5 h-5 text-white" />}
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
          'w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform duration-fast ease-ease-bounce group-hover:scale-110 group-active:scale-95',
          isAccept
            ? 'bg-green-500 hover:bg-green-600 shadow-green-500/40 animate-pulse'
            : 'bg-red-500 hover:bg-red-600 shadow-red-500/40',
        ].join(' ')}
      >
        {children}
      </span>
      <span className="text-[10px] text-white/70">{label}</span>
    </button>
  )
}
