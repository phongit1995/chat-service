import {
  useTracks,
  TrackRefContext,
  VideoTrack,
  isTrackReference,
  useParticipants,
  type TrackReference,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useCallStore } from '../../store/callStore'
import { useDraggable } from '../../hooks/useDraggable'
import { useSpeaking } from './hooks/useSpeaking'
import { usePipResize } from './hooks/usePipResize'
import { PipResizeHandles } from './PipResizeHandles'
import { Avatar } from '../ui'

const PIP_ASPECT = 4 / 3
const PIP_MIN_WIDTH = 96
const PIP_MAX_WIDTH = 280
const PIP_DEFAULT_WIDTH = 144

interface CallVideoAreaProps {
  camOff?: boolean
  peerName: string
  peerAvatar?: string
  statusLabel: string
}

export const CallVideoArea = ({
  camOff,
  peerName,
  peerAvatar,
  statusLabel,
}: CallVideoAreaProps) => {
  const {
    localVideoPos,
    setLocalVideoPos,
    localVideoWidth,
    setLocalVideoWidth,
    micMuted,
  } = useCallStore()
  const pipWidth = localVideoWidth ?? PIP_DEFAULT_WIDTH
  const pipHeight = pipWidth * PIP_ASPECT

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: false },
  )
  const realTracks = tracks.filter(isTrackReference) as TrackReference[]
  const remoteCamera = realTracks.find((t) => !t.participant.isLocal)
  const localCamera = realTracks.find((t) => t.participant.isLocal)

  const participants = useParticipants()
  const remoteParticipant = participants.find((p) => !p.isLocal)
  const localParticipant = participants.find((p) => p.isLocal)
  const remoteSpeaking = useSpeaking(remoteParticipant)
  const localSpeaking = useSpeaking(localParticipant)

  const { dragStyle, dragHandleProps, nodeRef } = useDraggable({
    initialRight: 16,
    initialTop: 16,
    position: localVideoPos,
    onChange: setLocalVideoPos,
  })

  const { makeHandlers } = usePipResize({
    nodeRef,
    width: pipWidth,
    minWidth: PIP_MIN_WIDTH,
    maxWidth: PIP_MAX_WIDTH,
    aspect: PIP_ASPECT,
    onCommit: setLocalVideoWidth,
  })

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      {remoteCamera ? (
        <RemoteVideoBackground track={remoteCamera} speaking={remoteSpeaking} />
      ) : (
        <PeerAvatar
          name={peerName}
          avatar={peerAvatar}
          statusLabel={statusLabel}
          speaking={remoteSpeaking}
        />
      )}

      {localCamera && !camOff && (
        <TrackRefContext.Provider value={localCamera}>
          <div
            ref={nodeRef}
            style={{ ...dragStyle, width: pipWidth, height: pipHeight, zIndex: 50 }}
            {...dragHandleProps}
            className={`relative rounded-xl overflow-hidden shadow-2xl bg-black cursor-grab active:cursor-grabbing select-none transition-[box-shadow,border-color] duration-200 ${
              localSpeaking
                ? 'ring-4 ring-green-400 shadow-[0_0_24px_rgba(74,222,128,0.55)]'
                : 'ring-2 ring-white/30'
            }`}
          >
            <VideoTrack
              trackRef={localCamera}
              className="w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />
            <MicBadge muted={micMuted} speaking={localSpeaking} />
            <PipResizeHandles makeHandlers={makeHandlers} />
          </div>
        </TrackRefContext.Provider>
      )}
    </div>
  )
}

const MicBadge = ({ muted, speaking }: { muted: boolean; speaking: boolean }) => {
  const bg = muted ? 'bg-red-500' : speaking ? 'bg-green-500' : 'bg-black/60'
  const ring = speaking && !muted ? 'ring-2 ring-green-300/80 animate-pulse' : ''
  return (
    <div className={`absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full ${bg} ${ring} flex items-center justify-center shadow-md pointer-events-none transition-colors duration-200`}>
      {muted ? (
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )}
    </div>
  )
}

const RemoteVideoBackground = ({
  track,
  speaking,
}: {
  track: TrackReference
  speaking: boolean
}) => (
  <TrackRefContext.Provider value={track}>
    <VideoTrack
      trackRef={track}
      className="absolute inset-0 w-full h-full object-cover"
    />
    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none" />
    {speaking && (
      <div className="absolute inset-0 pointer-events-none ring-4 ring-inset ring-green-400/80 shadow-[inset_0_0_40px_rgba(74,222,128,0.35)] transition-opacity duration-200" />
    )}
  </TrackRefContext.Provider>
)

const PeerAvatar = ({
  name,
  avatar,
  statusLabel,
  speaking,
}: {
  name: string
  avatar?: string
  statusLabel: string
  speaking: boolean
}) => (
  <div className="relative z-10 flex flex-col items-center pointer-events-none">
    <div className="relative mb-4 sm:mb-6 scale-110 sm:scale-150">
      <div className="absolute inset-0 rounded-full bg-gradient-signature opacity-30 blur-2xl animate-pulse" />
      <div
        className={`relative rounded-full transition-all duration-200 ${
          speaking
            ? 'ring-4 ring-green-400 shadow-[0_0_30px_rgba(74,222,128,0.7)]'
            : ''
        }`}
      >
        <Avatar src={avatar} name={name} size="xl" />
      </div>
    </div>
    <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center px-4">
      {name}
    </h2>
    <p className="text-white/90 text-base sm:text-lg font-medium mt-2 sm:mt-3 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
      {statusLabel}
    </p>
  </div>
)
