import { useEffect, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
} from '@livekit/components-react'
import { RoomEvent, ConnectionState } from 'livekit-client'
import '@livekit/components-styles'
import { useCallStore, formatCallDuration, peerDisplayName } from '../../store/callStore'
import { CallControls } from './CallControls'
import { CallVideoArea } from './CallVideoArea'
import { CallMiniWidget } from './CallMiniWidget'

const ROOM_OPTIONS = { adaptiveStream: true, dynacast: true }
const ROOM_STYLE = { background: 'transparent' }

export const CallScreen = () => {
  const { mode, active } = useCallStore()

  if (!active || (mode !== 'active' && mode !== 'outgoing')) return null

  const isVideo = active.callType === 'video'

  return (
    <LiveKitRoom
      serverUrl={active.wsUrl}
      token={active.token}
      connect={true}
      audio={true}
      video={isVideo}
      options={ROOM_OPTIONS}
      data-lk-theme="default"
      style={ROOM_STYLE}
    >
      <RoomAudioRenderer />
      <CallContent />
    </LiveKitRoom>
  )
}

const CallContent = () => {
  const { active, mode, expanded, endActive, setExpanded, camOff } = useCallStore()
  const room = useRoomContext()
  const [elapsed, setElapsed] = useState(0)
  const [connState, setConnState] = useState<ConnectionState>(ConnectionState.Connecting)

  useEffect(() => {
    if (!room) return
    const onConn = (s: ConnectionState) => setConnState(s)
    room.on(RoomEvent.ConnectionStateChanged, onConn)
    setConnState(room.state)
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, onConn)
    }
  }, [room])

  useEffect(() => {
    if (mode !== 'active') return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [mode])

  useEffect(() => {
    if (!room) return
    const onLeft = () => endActive()
    room.on(RoomEvent.ParticipantDisconnected, onLeft)
    return () => {
      room.off(RoomEvent.ParticipantDisconnected, onLeft)
    }
  }, [room, endActive])

  if (!active) return null

  const name = peerDisplayName(active.peer)
  const isVideo = active.callType === 'video'

  const statusLabel =
    mode === 'outgoing' ? 'Ringing…'
    : connState === ConnectionState.Connecting ? 'Connecting…'
    : connState === ConnectionState.Reconnecting ? 'Reconnecting…'
    : mode === 'active' ? formatCallDuration(elapsed)
    : 'Connected'

  if (!expanded) {
    return <CallMiniWidget statusLabel={statusLabel} />
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={() => setExpanded(false)}
          title="Minimize"
          className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M20 12H4" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="font-semibold text-lg text-white">{name}</h2>
          <p className="text-sm text-white/90 font-medium mt-0.5">{statusLabel}</p>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-white/70 font-medium">
          {isVideo ? 'Video call' : 'Voice call'}
        </span>
      </div>

      <CallVideoArea
        isVideo={isVideo}
        camOff={camOff}
        peerName={name}
        peerAvatar={active.peer.avatar}
        statusLabel={statusLabel}
      />

      <CallControls isVideo={isVideo} onEnd={endActive} />
    </div>
  )
}
