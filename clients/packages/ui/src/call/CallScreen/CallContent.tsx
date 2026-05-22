import { useState } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { useCallStore, peerDisplayName } from '@chat/shared'
import { useConnectionState, useElapsedSeconds } from '../hooks/useCallTelemetry'
import { CallControls } from '../CallControls'
import { CallVideoArea } from '../CallVideoArea'
import { CallMiniWidget } from '../CallMiniWidget'
import { CallHeader } from '../CallHeader'
import { CallSettingsPanel } from '../CallSettingsPanel'
import { computeStatusLabel } from './callStatus.utils'
import { useArmCallTracks } from './useArmCallTracks'
import { usePeerAudioFallback } from './usePeerAudioFallback'

interface CallContentProps {
  enableAudioOnJoin: boolean
  enableVideoOnJoin: boolean
}

export const CallContent = ({ enableAudioOnJoin, enableVideoOnJoin }: CallContentProps) => {
  const { active, mode, expanded, endActive, setExpanded, camOff } = useCallStore()
  const room = useRoomContext()
  const connState = useConnectionState(room)
  const elapsed = useElapsedSeconds(mode === 'active')
  const [settingsOpen, setSettingsOpen] = useState(false)

  useArmCallTracks(enableAudioOnJoin, enableVideoOnJoin)
  usePeerAudioFallback()

  if (!active) return null

  const name = peerDisplayName(active.peer)
  const isVideo = active.callType === 'video'
  const statusLabel = computeStatusLabel(mode, connState, elapsed)

  if (!expanded) {
    return <CallMiniWidget statusLabel={statusLabel} />
  }

  return (
    <div className="fixed inset-0 z-[90] h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden">
      <CallVideoArea camOff={camOff} peerName={name} peerAvatar={active.peer.avatar} statusLabel={statusLabel} />

      <CallHeader name={name} statusLabel={statusLabel} isVideo={isVideo} onMinimize={() => setExpanded(false)} />

      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-8">
        <CallControls isVideo={isVideo} onEnd={endActive} onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      <CallSettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
