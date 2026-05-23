import {
  useTracks,
  TrackRefContext,
  VideoTrack,
  isTrackReference,
  type TrackReference,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useCallStore, peerDisplayName } from '@chat/shared'
import { useDraggable } from '../hooks/useDraggable'
import { Avatar } from '../common'
import { PhoneIcon, VideoIcon } from './icons'
import { useCallMediaToggle } from './hooks/useCallMediaToggle'

interface CallMiniWidgetProps {
  statusLabel: string
}

export const CallMiniWidget = ({ statusLabel }: CallMiniWidgetProps) => {
  const { active, endActive, setExpanded, miniPos, setMiniPos } = useCallStore()
  const { micMuted, camOff, toggleMic, toggleCam } = useCallMediaToggle()
  const { dragStyle, dragHandleProps, nodeRef } = useDraggable({
    initialRight: 24,
    initialTop: 80,
    position: miniPos,
    onChange: setMiniPos,
  })

  if (!active) return null

  const name = peerDisplayName(active.peer)
  const isVideo = active.callType === 'video'
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: false },
  )
  const remoteCamera = (tracks.filter(isTrackReference) as TrackReference[]).find(
    (t) => !t.participant.isLocal,
  )

  const showVideo = !!remoteCamera

  const stopProp = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation()

  const ExpandBtn = (
    <button
      onPointerDown={stopProp}
      onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
      title="Expand"
      className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur flex items-center justify-center text-white transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95 cursor-pointer"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
      </svg>
    </button>
  )

  const MicBtn = (
    <button
      onPointerDown={stopProp}
      onClick={(e) => { e.stopPropagation(); toggleMic() }}
      title={micMuted ? 'Unmute' : 'Mute'}
      className={`w-8 h-8 rounded-full flex items-center justify-center text-white backdrop-blur transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95 cursor-pointer ${micMuted ? 'bg-red-500/80 hover:bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}
    >
      {micMuted ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15a2 2 0 002.828 0L19 4.414M9 9v3a3 3 0 005.12 2.12M15 9.34V5a3 3 0 00-5.94-.6M3 3l18 18" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0M12 19v3m-3 0h6M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z" />
        </svg>
      )}
    </button>
  )

  const CamBtn = isVideo ? (
    <button
      onPointerDown={stopProp}
      onClick={(e) => { e.stopPropagation(); toggleCam() }}
      title={camOff ? 'Camera on' : 'Camera off'}
      className={`w-8 h-8 rounded-full flex items-center justify-center text-white backdrop-blur transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95 cursor-pointer ${camOff ? 'bg-red-500/80 hover:bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}
    >
      <VideoIcon className="w-3.5 h-3.5" />
    </button>
  ) : null

  const EndBtn = (
    <button
      onPointerDown={stopProp}
      onClick={(e) => { e.stopPropagation(); endActive() }}
      title="End call"
      className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/40 transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95 cursor-pointer"
    >
      <PhoneIcon className="w-3.5 h-3.5 rotate-[135deg]" />
    </button>
  )

  return (
    <div
      ref={nodeRef}
      style={{ ...dragStyle, zIndex: 10000 }}
      className={`${showVideo ? 'w-[160px] sm:w-[220px]' : 'w-[240px] sm:w-[300px]'} max-w-[calc(100vw-24px)] select-none`}
    >
      <div
        {...dragHandleProps}
        className="relative bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl shadow-2xl ring-1 ring-white/10 overflow-hidden cursor-grab active:cursor-grabbing"
      >
        {showVideo ? (
          <div className="relative">
            <TrackRefContext.Provider value={remoteCamera}>
              <div className="w-full aspect-[3/4] bg-black">
                <VideoTrack
                  trackRef={remoteCamera}
                  className="w-full h-full object-cover"
                />
              </div>
            </TrackRefContext.Provider>

            <div className="absolute top-0 left-0 right-0 p-2 pr-12 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
              <h3 className="text-xs font-semibold truncate text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {name}
              </h3>
              <p className="text-[10px] truncate text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {statusLabel}
              </p>
            </div>

            <div className="absolute top-2 right-2 z-10">{ExpandBtn}</div>

            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
              {MicBtn}
              {CamBtn}
              {EndBtn}
            </div>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-signature opacity-10 pointer-events-none" />
            <div className="absolute top-2 right-2 z-10">{ExpandBtn}</div>

            <div className="relative p-3 pr-12 flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-gradient-signature opacity-30 blur-md animate-pulse" />
                <div className="relative">
                  <Avatar src={active.peer.avatar} name={name} size="md" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate" style={{ color: '#fff' }}>{name}</h3>
                <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {isVideo ? '📹' : '📞'} {statusLabel}
                </p>
              </div>
            </div>

            <div className="relative flex items-center justify-end gap-1.5 px-3 pb-2 z-10">
              {MicBtn}
              {CamBtn}
              {EndBtn}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
