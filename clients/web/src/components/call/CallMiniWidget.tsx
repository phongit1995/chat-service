import {
  useTracks,
  TrackRefContext,
  VideoTrack,
  isTrackReference,
  type TrackReference,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useCallStore, peerDisplayName } from '../../store/callStore'
import { useDraggable } from '../../hooks/useDraggable'
import { Avatar } from '../ui'
import { PhoneIcon } from './icons'

interface CallMiniWidgetProps {
  statusLabel: string
}

export const CallMiniWidget = ({ statusLabel }: CallMiniWidgetProps) => {
  const { active, endActive, setExpanded, miniPos, setMiniPos } = useCallStore()
  const { dragStyle, dragHandleProps, nodeRef } = useDraggable({
    initialRight: 24,
    initialBottom: 24,
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

  return (
    <div
      ref={nodeRef}
      style={{ ...dragStyle, zIndex: 95 }}
      className={`${showVideo ? 'w-[160px] sm:w-[220px]' : 'w-[240px] sm:w-[300px]'} max-w-[calc(100vw-24px)] animate-slideInRight select-none`}
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

            <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
              <h3 className="text-xs font-semibold truncate text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {name}
              </h3>
              <p className="text-[10px] truncate text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {statusLabel}
              </p>
            </div>

            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
                title="Expand"
                className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur flex items-center justify-center text-white transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); endActive() }}
                title="End call"
                className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/40 transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95 cursor-pointer"
              >
                <PhoneIcon className="w-3.5 h-3.5 rotate-[135deg]" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-signature opacity-10 pointer-events-none" />
            <div className="relative p-3 flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-gradient-signature opacity-30 blur-md animate-pulse" />
                <div className="relative">
                  <Avatar src={active.peer.avatar} name={name} size="md" />
                </div>
              </div>

              <div className="flex-1 min-w-0 text-white">
                <h3 className="text-sm font-semibold truncate">{name}</h3>
                <p className="text-[11px] text-white/60 truncate">
                  {isVideo ? '📹' : '📞'} {statusLabel}
                </p>
              </div>

              <div className="flex items-center gap-1.5 relative z-10">
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
                  title="Expand"
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); endActive() }}
                  title="End call"
                  className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/40 transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95 cursor-pointer"
                >
                  <PhoneIcon className="w-4 h-4 rotate-[135deg]" />
                </button>
              </div>
            </div>

            <div className="flex justify-center gap-1 pb-1.5">
              {[0,1,2,3,4].map((i) => (
                <span key={i} className="w-1 h-1 rounded-full bg-white/20" />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
