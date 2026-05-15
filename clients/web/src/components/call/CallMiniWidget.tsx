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

  return (
    <div
      ref={nodeRef}
      style={{ ...dragStyle, zIndex: 95 }}
      className="w-[300px] animate-slideInRight select-none"
    >
      <div
        {...dragHandleProps}
        className="relative bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl shadow-2xl ring-1 ring-white/10 overflow-hidden cursor-grab active:cursor-grabbing"
      >
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
      </div>
    </div>
  )
}
