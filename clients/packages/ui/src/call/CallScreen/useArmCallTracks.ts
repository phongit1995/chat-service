import { useEffect } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { ConnectionState, RoomEvent, Track } from 'livekit-client'

export const useArmCallTracks = (enableAudioOnJoin: boolean, enableVideoOnJoin: boolean) => {
  const room = useRoomContext()

  useEffect(() => {
    if (!room) return
    let cancelled = false

    const arm = async () => {
      if (room.state !== ConnectionState.Connected) {
        await new Promise<void>((resolve) => {
          const onConn = (s: ConnectionState) => {
            if (s === ConnectionState.Connected) {
              room.off(RoomEvent.ConnectionStateChanged, onConn)
              resolve()
            }
          }
          room.on(RoomEvent.ConnectionStateChanged, onConn)
        })
      }
      if (cancelled) return

      if (enableAudioOnJoin) {
        const existing = room.localParticipant.getTrackPublication(Track.Source.Microphone)
        if (!existing?.track) {
          try {
            await room.localParticipant.setMicrophoneEnabled(true)
          } catch {}
        }
      }
      if (cancelled) return

      if (enableVideoOnJoin) {
        const existing = room.localParticipant.getTrackPublication(Track.Source.Camera)
        if (!existing?.track) {
          try {
            await room.localParticipant.setCameraEnabled(true)
          } catch {}
        }
      }
    }
    arm()
    return () => {
      cancelled = true
    }
  }, [room, enableAudioOnJoin, enableVideoOnJoin])
}
