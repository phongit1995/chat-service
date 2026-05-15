import {
  useTracks,
  TrackRefContext,
  VideoTrack,
  isTrackReference,
  type TrackReference,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { Avatar } from '../ui'

interface CallVideoAreaProps {
  isVideo: boolean
  camOff?: boolean
  peerName: string
  peerAvatar?: string
  statusLabel: string
}

export const CallVideoArea = ({
  isVideo,
  camOff,
  peerName,
  peerAvatar,
  statusLabel,
}: CallVideoAreaProps) => {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: true },
  )
  const realTracks = tracks.filter(isTrackReference) as TrackReference[]
  const remoteCamera = realTracks.find((t) => !t.participant.isLocal)
  const localCamera = realTracks.find((t) => t.participant.isLocal)

  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden">
      {isVideo && remoteCamera ? (
        <TrackRefContext.Provider value={remoteCamera}>
          <VideoTrack
            trackRef={remoteCamera}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </TrackRefContext.Provider>
      ) : (
        <div className="flex flex-col items-center">
          <div className="relative mb-6 scale-150">
            <div className="absolute inset-0 rounded-full bg-gradient-signature opacity-30 blur-2xl animate-pulse" />
            <div className="relative">
              <Avatar src={peerAvatar} name={peerName} size="xl" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mt-2">{peerName}</h2>
          <p className="text-white/90 text-lg font-medium mt-3">{statusLabel}</p>
        </div>
      )}

      {isVideo && localCamera && !camOff && (
        <TrackRefContext.Provider value={localCamera}>
          <div className="absolute top-4 right-4 w-36 h-48 rounded-xl overflow-hidden ring-2 ring-white/30 shadow-2xl bg-black">
            <VideoTrack
              trackRef={localCamera}
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>
        </TrackRefContext.Provider>
      )}
    </div>
  )
}
