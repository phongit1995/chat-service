import { useEffect, useState } from 'react'
import { ConnectionState, RoomEvent, type Room } from 'livekit-client'

export function useConnectionState(room: Room | undefined): ConnectionState {
  const [state, setState] = useState<ConnectionState>(
    room?.state ?? ConnectionState.Connecting,
  )
  useEffect(() => {
    if (!room) return
    const onConn = (s: ConnectionState) => setState(s)
    room.on(RoomEvent.ConnectionStateChanged, onConn)
    setState(room.state)
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, onConn)
    }
  }, [room])
  return state
}

export function useElapsedSeconds(running: boolean): number {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [running])
  return elapsed
}
