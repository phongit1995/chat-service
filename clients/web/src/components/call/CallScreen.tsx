import { useEffect, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
} from '@livekit/components-react'
import { ConnectionState, RoomEvent } from 'livekit-client'
import '@livekit/components-styles'
import { useCallStore, formatCallDuration, peerDisplayName } from '../../store/callStore'
import { useConnectionState, useElapsedSeconds } from './hooks/useCallTelemetry'
import { CallControls } from './CallControls'
import { CallVideoArea } from './CallVideoArea'
import { CallMiniWidget } from './CallMiniWidget'
import { CallHeader } from './CallHeader'
import { CallSettingsPanel } from './CallSettingsPanel'

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
      audio={false}
      video={false}
      options={ROOM_OPTIONS}
      data-lk-theme="default"
      style={ROOM_STYLE}
    >
      <RoomAudioRenderer />
      <CallContent enableAudioOnJoin enableVideoOnJoin={isVideo} />
    </LiveKitRoom>
  )
}

interface CallContentProps {
  enableAudioOnJoin: boolean
  enableVideoOnJoin: boolean
}

const CallContent = ({ enableAudioOnJoin, enableVideoOnJoin }: CallContentProps) => {
  const { active, mode, expanded, endActive, setExpanded, camOff } = useCallStore()
  const room = useRoomContext()
  const connState = useConnectionState(room)
  const elapsed = useElapsedSeconds(mode === 'active')
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Bật mic/cam tuần tự sau khi room connect (sequential để tránh getUserMedia
  // chạy song song và Chrome gộp 2 prompt thành 1, gây NotAllowedError).
  // Mỗi enable có try/catch riêng để một bên fail không kéo theo bên kia.
  useEffect(() => {
    if (!room) return
    let cancelled = false
    const arm = async () => {
      if (enableAudioOnJoin && !cancelled) {
        try {
          await room.localParticipant.setMicrophoneEnabled(true)
        } catch (e) {
          console.warn('[Call] auto-enable mic failed:', e)
        }
      }
      if (enableVideoOnJoin && !cancelled) {
        try {
          await room.localParticipant.setCameraEnabled(true)
        } catch (e) {
          console.warn('[Call] auto-enable camera failed:', e)
        }
      }
    }
    arm()
    return () => {
      cancelled = true
    }
  }, [room, enableAudioOnJoin, enableVideoOnJoin])

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
  const statusLabel = computeStatusLabel(mode, connState, elapsed)

  if (!expanded) {
    return <CallMiniWidget statusLabel={statusLabel} />
  }

  return (
    <div className="fixed inset-0 z-[90] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden">
      <CallVideoArea
        camOff={camOff}
        peerName={name}
        peerAvatar={active.peer.avatar}
        statusLabel={statusLabel}
      />

      <CallHeader
        name={name}
        statusLabel={statusLabel}
        isVideo={isVideo}
        onMinimize={() => setExpanded(false)}
      />

      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-8">
        <CallControls
          isVideo={isVideo}
          onEnd={endActive}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      <CallSettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

const computeStatusLabel = (
  mode: string,
  connState: ConnectionState,
  elapsed: number,
): string => {
  if (mode === 'outgoing') return 'Ringing…'
  if (connState === ConnectionState.Connecting) return 'Connecting…'
  if (connState === ConnectionState.Reconnecting) return 'Reconnecting…'
  if (mode === 'active') return formatCallDuration(elapsed)
  return 'Connected'
}
