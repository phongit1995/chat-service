import { TrackRefContext, VideoTrack, type TrackReference } from '@livekit/components-react'

interface RemoteVideoBackgroundProps {
  track: TrackReference
  speaking: boolean
}

export const RemoteVideoBackground = ({ track, speaking }: RemoteVideoBackgroundProps) => (
  <TrackRefContext.Provider value={track}>
    <VideoTrack trackRef={track} className="absolute inset-0 w-full h-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none" />
    {speaking && (
      <div className="absolute inset-0 pointer-events-none ring-4 ring-inset ring-green-400/80 shadow-[inset_0_0_40px_rgba(74,222,128,0.35)] transition-opacity duration-200" />
    )}
  </TrackRefContext.Provider>
)
