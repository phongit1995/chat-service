import { Track } from 'livekit-client'
import { useMicLevel } from '../hooks/useMicLevel'
import { useCallMediaToggle } from '../hooks/useCallMediaToggle'
import { VideoIcon, PhoneIcon } from '../icons'
import { MicControlButton } from './MicControlButton'
import { ControlButton } from './ControlButton'
import { permTitle } from './permission.utils'
import { useTrackMuteSync } from './useTrackMuteSync'
import type { CallControlsProps } from './CallControls.types'

export type { CallControlsProps } from './CallControls.types'

export const CallControls = ({ isVideo, onEnd, onOpenSettings }: CallControlsProps) => {
  const { localParticipant, micMuted, camOff, micPerm, camPerm, toggleMic, toggleCam } = useCallMediaToggle()
  const micBands = useMicLevel(localParticipant)

  useTrackMuteSync(Track.Source.Microphone, micMuted)
  useTrackMuteSync(Track.Source.Camera, camOff)

  return (
    <div
      className="px-4 sm:px-6 pt-4 sm:pt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-5"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
    >
      <MicControlButton
        micMuted={micMuted}
        micBands={micBands}
        title={permTitle('Microphone', micPerm, micMuted ? 'Unmute' : 'Mute')}
        onClick={toggleMic}
        perm={micPerm}
      />

      {isVideo && (
        <ControlButton
          active={camOff}
          title={permTitle('Camera', camPerm, camOff ? 'Camera on' : 'Camera off')}
          onClick={toggleCam}
          perm={camPerm}
        >
          <VideoIcon className="w-6 h-6" />
        </ControlButton>
      )}

      <button
        onClick={onOpenSettings}
        title="Settings"
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all duration-fast ease-ease-bounce hover:scale-110 active:scale-95 backdrop-blur-sm"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <button
        onClick={onEnd}
        title="End call"
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl shadow-red-500/40 transition-all duration-fast ease-ease-bounce hover:scale-110 active:scale-95"
      >
        <PhoneIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white rotate-[135deg]" />
      </button>
    </div>
  )
}
