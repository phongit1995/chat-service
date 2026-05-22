import {
  useTracks,
  TrackRefContext,
  VideoTrack,
  isTrackReference,
  useParticipants,
  type TrackReference,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useCallStore } from '@chat/shared'
import { useDraggable } from '../../hooks/useDraggable'
import { useSpeaking } from '../hooks/useSpeaking'
import { usePipResize } from '../hooks/usePipResize'
import { PipResizeHandles } from '../PipResizeHandles'
import { MicBadge } from './MicBadge'
import { RemoteVideoBackground } from './RemoteVideoBackground'
import { PeerAvatar } from './PeerAvatar'
import {
  PIP_ASPECT,
  PIP_DEFAULT_WIDTH,
  PIP_MAX_WIDTH,
  PIP_MIN_WIDTH,
} from './CallVideoArea.types'
import type { CallVideoAreaProps } from './CallVideoArea.types'

export type { CallVideoAreaProps } from './CallVideoArea.types'

export const CallVideoArea = ({ camOff, peerName, peerAvatar, statusLabel }: CallVideoAreaProps) => {
  const { localVideoPos, setLocalVideoPos, localVideoWidth, setLocalVideoWidth, micMuted } = useCallStore()
  const pipWidth = localVideoWidth ?? PIP_DEFAULT_WIDTH
  const pipHeight = pipWidth * PIP_ASPECT

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }], { onlySubscribed: false })
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
        <PeerAvatar name={peerName} avatar={peerAvatar} statusLabel={statusLabel} speaking={remoteSpeaking} />
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
