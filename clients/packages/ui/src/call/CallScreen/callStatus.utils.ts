import { ConnectionState } from 'livekit-client'
import { formatCallDuration } from '@chat/shared'

export const computeStatusLabel = (
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
