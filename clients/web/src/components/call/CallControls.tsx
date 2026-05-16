import { useLocalParticipant } from '@livekit/components-react'
import { ParticipantEvent, Track } from 'livekit-client'
import { useEffect, type ReactNode } from 'react'
import { useCallStore } from '../../store/callStore'
import { usePermissionStatus } from './hooks/usePermissionStatus'
import { requestAndPublish, permDeniedHint, type MediaSource } from './lib/callMedia'
import { PERM_MIC, PERM_CAM, PERM_STATE, REQUEST_RESULT } from './constants'
import type { PermState } from './interfaces'
import { MicIcon, MicOffIcon, VideoIcon, PhoneIcon } from './icons'

interface CallControlsProps {
  isVideo: boolean
  onEnd: () => void
  onOpenSettings: () => void
}

export const CallControls = ({ isVideo, onEnd, onOpenSettings }: CallControlsProps) => {
  const { localParticipant } = useLocalParticipant()
  const { micMuted, camOff, setMicMuted, setCamOff } = useCallStore()
  const micPerm = usePermissionStatus(PERM_MIC)
  const camPerm = usePermissionStatus(PERM_CAM)

  // Sync persisted store mute state back to the LiveKit track whenever this
  // panel remounts (e.g. after minimize → expand).
  useTrackMuteSync(Track.Source.Microphone, micMuted)
  useTrackMuteSync(Track.Source.Camera, camOff)

  const toggleSource = async (
    source: MediaSource,
    perm: PermState,
    muted: boolean,
    setMuted: (m: boolean) => void,
  ) => {
    if (perm === PERM_STATE.DENIED) {
      alert(permDeniedHint(source))
      return
    }
    const pub = localParticipant.getTrackPublication(source)
    if (!pub?.track) {
      const result = await requestAndPublish(localParticipant, source)
      if (result === REQUEST_RESULT.DENIED) alert(permDeniedHint(source))
      else if (result === REQUEST_RESULT.GRANTED) setMuted(false)
      return
    }
    const next = !muted
    setMuted(next)
    if (next) pub.track.mute()
    else pub.track.unmute()
  }

  return (
    <div className="px-6 py-6 flex items-center justify-center gap-5">
      <ControlButton
        active={micMuted}
        title={permTitle('Microphone', micPerm, micMuted ? 'Unmute' : 'Mute')}
        onClick={() =>
          toggleSource(Track.Source.Microphone, micPerm, micMuted, setMicMuted)
        }
        perm={micPerm}
      >
        {micMuted ? <MicOffIcon /> : <MicIcon />}
      </ControlButton>

      {isVideo && (
        <ControlButton
          active={camOff}
          title={permTitle('Camera', camPerm, camOff ? 'Camera on' : 'Camera off')}
          onClick={() =>
            toggleSource(Track.Source.Camera, camPerm, camOff, setCamOff)
          }
          perm={camPerm}
        >
          <VideoIcon className="w-6 h-6" />
        </ControlButton>
      )}

      <button
        onClick={onOpenSettings}
        title="Settings"
        className="w-14 h-14 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all duration-fast ease-ease-bounce hover:scale-110 active:scale-95 backdrop-blur-sm"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <button
        onClick={onEnd}
        title="End call"
        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl shadow-red-500/40 transition-all duration-fast ease-ease-bounce hover:scale-110 active:scale-95"
      >
        <PhoneIcon className="w-7 h-7 text-white rotate-[135deg]" />
      </button>
    </div>
  )
}

const useTrackMuteSync = (source: MediaSource, muted: boolean) => {
  const { localParticipant } = useLocalParticipant()
  useEffect(() => {
    const apply = () => {
      const pub = localParticipant.getTrackPublication(source)
      if (!pub?.track) return
      if (muted && !pub.track.isMuted) pub.track.mute()
      else if (!muted && pub.track.isMuted) pub.track.unmute()
    }
    apply()
    localParticipant.on(ParticipantEvent.LocalTrackPublished, apply)
    return () => {
      localParticipant.off(ParticipantEvent.LocalTrackPublished, apply)
    }
  }, [localParticipant, source, muted])
}

const permTitle = (label: string, perm: PermState, base: string) => {
  if (perm === PERM_STATE.DENIED) return `${label} blocked — change in browser settings`
  if (perm === PERM_STATE.PROMPT) return `${label} not yet allowed`
  return base
}

interface ControlButtonProps {
  active: boolean
  title: string
  onClick: () => void
  children: ReactNode
  perm?: PermState
}

const ControlButton = ({ active, title, onClick, children, perm }: ControlButtonProps) => {
  const dotColor =
    perm === PERM_STATE.DENIED ? 'bg-red-500'
    : perm === PERM_STATE.GRANTED ? 'bg-green-500'
    : perm === PERM_STATE.PROMPT ? 'bg-amber-400'
    : null
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        'relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-fast ease-ease-bounce hover:scale-110 active:scale-95 backdrop-blur-sm',
        active ? 'bg-white text-slate-900' : 'bg-white/15 hover:bg-white/25 text-white',
      ].join(' ')}
    >
      {children}
      {dotColor && (
        <span
          className={`absolute top-0.5 right-0.5 w-3 h-3 rounded-full ring-2 ring-slate-900 ${dotColor}`}
        />
      )}
    </button>
  )
}
