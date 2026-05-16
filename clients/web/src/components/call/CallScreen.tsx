import { useEffect, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
} from '@livekit/components-react'
import { ConnectionState, RoomEvent, Track } from 'livekit-client'
import '@livekit/components-styles'
import { useCallStore, formatCallDuration, peerDisplayName } from '../../store/callStore'
import { useConnectionState, useElapsedSeconds } from './hooks/useCallTelemetry'
import { CallControls } from './CallControls'
import { CallVideoArea } from './CallVideoArea'
import { CallMiniWidget } from './CallMiniWidget'
import { CallHeader } from './CallHeader'
import { CallSettingsPanel } from './CallSettingsPanel'

const ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    audioPreset: { maxBitrate: 24_000 },
    red: false,
    dtx: false,
  },
}
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
      // Wait until PeerConnection is fully connected before publishing
      // (otherwise audio packets are produced before SDP negotiation completes
      // and the peer never hears the first seconds — sometimes never).
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

  useEffect(() => {
    if (!room) return
    const onLeft = () => endActive()
    // Belt-and-suspenders: RoomAudioRenderer already attaches subscribed audio,
    // but on some browsers (Chrome 120+ HTTP, mobile Safari) it may skip play
    // when there is no user gesture in scope. Attach a duplicate hidden element
    // here and call play() directly so the peer's audio is audible from the
    // moment the track is subscribed.
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
    const onLocalPub = (pub: unknown) => {
      const p = pub as { kind: string; source: string; sid: string; trackName: string }
      console.log('[room] LocalTrackPublished kind=', p.kind, 'source=', p.source, 'sid=', p.sid, 'name=', p.trackName)
    }
    room.on(RoomEvent.LocalTrackPublished, onLocalPub)
    const onActiveSpeakers = (speakers: unknown[]) => {
      const list = (speakers as Array<{ identity: string; isSpeaking: boolean; audioLevel: number }>).map(
        (p) => `${p.identity?.slice(0, 8)}(${p.isSpeaking}/${p.audioLevel?.toFixed(3)})`,
      )
      console.log('[room] ActiveSpeakersChanged count=', speakers.length, 'speakers=', list)
    }
    room.on(RoomEvent.ParticipantDisconnected, onLeft)
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed)
    room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakers)
    return () => {
      room.off(RoomEvent.ParticipantDisconnected, onLeft)
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed)
      room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakers)
      room.off(RoomEvent.LocalTrackPublished, onLocalPub)
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
    <div className="fixed inset-0 z-[90] h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden">
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
