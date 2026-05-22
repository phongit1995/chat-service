import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react'
import '@livekit/components-styles'
import { useCallStore } from '@chat/shared'
import { CallContent } from './CallContent'

const ROOM_OPTIONS = { adaptiveStream: true, dynacast: true }

export const CallScreen = () => {
  const { mode, active, expanded } = useCallStore()

  if (!active || (mode !== 'active' && mode !== 'outgoing')) return null

  const isVideo = active.callType === 'video'
  const roomStyle: React.CSSProperties = expanded
    ? { background: 'transparent' }
    : {
        position: 'fixed',
        inset: 'auto',
        width: 0,
        height: 0,
        background: 'transparent',
      }

  return (
    <LiveKitRoom
      serverUrl={active.wsUrl}
      token={active.token}
      connect={true}
      audio={false}
      video={false}
      options={ROOM_OPTIONS}
      data-lk-theme="default"
      style={roomStyle}
    >
      <RoomAudioRenderer />
      <CallContent enableAudioOnJoin enableVideoOnJoin={isVideo} />
    </LiveKitRoom>
  )
}
