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
import { Avatar } from '../ui'

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
  const { localVideoPos, setLocalVideoPos } = useCallStore()
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
            style={{ ...dragStyle, zIndex: 50 }}
            {...dragHandleProps}
            className={`w-36 h-48 rounded-xl overflow-hidden shadow-2xl bg-black cursor-grab active:cursor-grabbing select-none transition-all duration-200 ${
              localSpeaking
                ? 'ring-4 ring-green-400 shadow-[0_0_24px_rgba(74,222,128,0.55)]'
                : 'ring-2 ring-white/30'
            }`}
          >
            <VideoTrack
              trackRef={localCamera}
              className="w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />
          </div>
        </TrackRefContext.Provider>
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
    <div className="relative mb-6 scale-150">
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
    <h2 className="text-3xl font-bold text-white mt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
      {name}
    </h2>
    <p className="text-white/90 text-lg font-medium mt-3 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
      {statusLabel}
    </p>
  </div>
)
