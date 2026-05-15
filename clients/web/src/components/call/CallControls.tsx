import { useLocalParticipant } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useEffect, type ReactNode } from 'react'
import { useCallStore } from '../../store/callStore'
import { MicIcon, MicOffIcon, VideoIcon, PhoneIcon } from './icons'

interface CallControlsProps {
  isVideo: boolean
  onEnd: () => void
}

export const CallControls = ({ isVideo, onEnd }: CallControlsProps) => {
  const { localParticipant } = useLocalParticipant()
  const { micMuted, camOff, setMicMuted, setCamOff } = useCallStore()

  // When this component re-mounts (e.g. after minimize→expand), sync the
  // LiveKit track's mute state to match the persisted store state so the
  // peer hears/sees the correct thing.
  useEffect(() => {
    const pub = localParticipant.getTrackPublication(Track.Source.Microphone)
    if (pub?.track) {
      if (micMuted && !pub.track.isMuted) pub.track.mute()
      else if (!micMuted && pub.track.isMuted) pub.track.unmute()
    }
  }, [localParticipant, micMuted])

  useEffect(() => {
    const pub = localParticipant.getTrackPublication(Track.Source.Camera)
    if (pub?.track) {
      if (camOff && !pub.track.isMuted) pub.track.mute()
      else if (!camOff && pub.track.isMuted) pub.track.unmute()
    }
  }, [localParticipant, camOff])

  const toggleMic = () => {
    const next = !micMuted
    setMicMuted(next)
    const pub = localParticipant.getTrackPublication(Track.Source.Microphone)
    if (pub?.track) {
      if (next) pub.track.mute()
      else pub.track.unmute()
    } else {
      localParticipant.setMicrophoneEnabled(!next).catch(() => {})
    }
  }

  const toggleCam = () => {
    const next = !camOff
    setCamOff(next)
    const pub = localParticipant.getTrackPublication(Track.Source.Camera)
    if (pub?.track) {
      if (next) pub.track.mute()
      else pub.track.unmute()
    } else {
      localParticipant.setCameraEnabled(!next).catch(() => {})
    }
  }

  return (
    <div className="px-6 py-6 flex items-center justify-center gap-5 bg-gradient-to-t from-black/60 to-transparent">
      <ControlButton
        active={micMuted}
        title={micMuted ? 'Unmute' : 'Mute'}
        onClick={toggleMic}
      >
        {micMuted ? <MicOffIcon /> : <MicIcon />}
      </ControlButton>

      {isVideo && (
        <ControlButton
          active={camOff}
          title={camOff ? 'Camera on' : 'Camera off'}
          onClick={toggleCam}
        >
          <VideoIcon className="w-6 h-6" />
        </ControlButton>
      )}

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

interface ControlButtonProps {
  active: boolean
  title: string
  onClick: () => void
  children: ReactNode
}

const ControlButton = ({ active, title, onClick, children }: ControlButtonProps) => (
  <button
    onClick={onClick}
    title={title}
    className={[
      'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-fast ease-ease-bounce hover:scale-110 active:scale-95',
      active ? 'bg-white text-slate-900' : 'bg-white/15 hover:bg-white/25 text-white',
    ].join(' ')}
  >
    {children}
  </button>
)
