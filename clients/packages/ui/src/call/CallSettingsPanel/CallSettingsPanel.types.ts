import type { DeviceKind } from '../interfaces'

export interface CallSettingsPanelProps {
  open: boolean
  onClose: () => void
}

export const deviceKindLabel = (kind: DeviceKind): string => {
  if (kind === 'audioinput') return 'microphone'
  if (kind === 'videoinput') return 'camera'
  return 'speaker'
}
