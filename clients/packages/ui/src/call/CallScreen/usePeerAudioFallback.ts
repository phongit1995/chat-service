import { useEffect } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent } from 'livekit-client'
import { useCallStore } from '@chat/shared'

export const usePeerAudioFallback = () => {
  const room = useRoomContext()
  const { endActive } = useCallStore()

  useEffect(() => {
    if (!room) return
    const onLeft = () => endActive()
    const onTrackSubscribed = (track: unknown) => {
      const t = track as { kind: string; attach?: () => HTMLMediaElement }
      if (t.kind !== 'audio' || typeof t.attach !== 'function') return
      try {
        const el = t.attach() as HTMLAudioElement
        el.autoplay = true
        el.volume = 1
        el.muted = false
        document.body.appendChild(el)
        el.play().catch(() => {})
      } catch {}
    }
    room.on(RoomEvent.ParticipantDisconnected, onLeft)
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed)
    return () => {
      room.off(RoomEvent.ParticipantDisconnected, onLeft)
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed)
    }
  }, [room, endActive])
}
