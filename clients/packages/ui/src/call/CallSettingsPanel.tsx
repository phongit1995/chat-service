import { useEffect } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { useCallStore } from '@chat/shared'
import { useMediaDevices } from './hooks/useMediaDevices'
import { usePermissionStatus } from './hooks/usePermissionStatus'
import { DEVICE_KIND, PERM_STATE, PERM_MIC, PERM_CAM } from './constants'
import type { DeviceKind, PermState } from './interfaces'

interface CallSettingsPanelProps {
  open: boolean
  onClose: () => void
}

export const CallSettingsPanel = ({ open, onClose }: CallSettingsPanelProps) => {
  const room = useRoomContext()
  const devices = useMediaDevices()
  const {
    selectedMicId,
    selectedCamId,
    selectedSpeakerId,
    setSelectedMicId,
    setSelectedCamId,
    setSelectedSpeakerId,
  } = useCallStore()
  const micPerm = usePermissionStatus(PERM_MIC)
  const camPerm = usePermissionStatus(PERM_CAM)

  useEffect(() => {
    if (!room) return
    if (selectedMicId)
      room.switchActiveDevice(DEVICE_KIND.AUDIO_INPUT, selectedMicId).catch(() => {})
    if (selectedCamId)
      room.switchActiveDevice(DEVICE_KIND.VIDEO_INPUT, selectedCamId).catch(() => {})
    if (selectedSpeakerId)
      room.switchActiveDevice(DEVICE_KIND.AUDIO_OUTPUT, selectedSpeakerId).catch(() => {})
  }, [room, selectedMicId, selectedCamId, selectedSpeakerId])

  const change = async (kind: DeviceKind, id: string) => {
    if (kind === DEVICE_KIND.AUDIO_INPUT) setSelectedMicId(id)
    else if (kind === DEVICE_KIND.VIDEO_INPUT) setSelectedCamId(id)
    else setSelectedSpeakerId(id)
    try {
      await room?.switchActiveDevice(kind, id)
    } catch {}
  }

  return (
    <>
      <div
        onClick={onClose}
        className={`absolute inset-0 z-30 bg-black/30 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        className={`absolute z-40 bg-slate-900/95 backdrop-blur-md text-white shadow-2xl ring-1 ring-white/10 transition-transform duration-300
          left-0 right-0 bottom-0 h-[80dvh] rounded-t-2xl
          sm:left-auto sm:top-0 sm:right-0 sm:bottom-0 sm:w-80 sm:h-full sm:rounded-none
          ${open
            ? 'translate-y-0 sm:translate-y-0 sm:translate-x-0'
            : 'translate-y-full sm:translate-y-0 sm:translate-x-full'}`}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-semibold">Call settings</h3>
          <button
            onClick={onClose}
            title="Close"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div
          className="px-4 sm:px-5 py-4 space-y-5 overflow-y-auto"
          style={{ maxHeight: 'calc(100% - 60px)', paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        >
          <DeviceSection
            label="Microphone"
            perm={micPerm}
            devices={devices.audioinput}
            selectedId={selectedMicId}
            onChange={(id) => change(DEVICE_KIND.AUDIO_INPUT, id)}
          />
          <DeviceSection
            label="Camera"
            perm={camPerm}
            devices={devices.videoinput}
            selectedId={selectedCamId}
            onChange={(id) => change(DEVICE_KIND.VIDEO_INPUT, id)}
          />
          <DeviceSection
            label="Speaker"
            devices={devices.audiooutput}
            selectedId={selectedSpeakerId}
            onChange={(id) => change(DEVICE_KIND.AUDIO_OUTPUT, id)}
          />
        </div>
      </aside>
    </>
  )
}

interface DeviceSectionProps {
  label: string
  perm?: PermState
  devices: MediaDeviceInfo[]
  selectedId: string | null
  onChange: (id: string) => void
}

const DeviceSection = ({
  label,
  perm,
  devices,
  selectedId,
  onChange,
}: DeviceSectionProps) => {
  const empty = devices.length === 0
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs uppercase tracking-wider text-white/60 font-medium">
          {label}
        </span>
        {perm && <PermBadge perm={perm} />}
      </div>
      {empty ? (
        <p className="text-sm text-white/50 italic">
          {perm === 'denied'
            ? 'Permission blocked — devices hidden by browser'
            : perm === 'prompt'
              ? 'Grant permission to see devices'
              : 'No devices found'}
        </p>
      ) : (
        <select
          value={selectedId ?? devices[0]?.deviceId ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {devices.map((d, i) => (
            <option key={d.deviceId || i} value={d.deviceId}>
              {d.label || `${label} ${i + 1}`}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

const PermBadge = ({ perm }: { perm: PermState }) => {
  const color =
    perm === PERM_STATE.GRANTED ? 'bg-green-500'
    : perm === PERM_STATE.DENIED ? 'bg-red-500'
    : perm === PERM_STATE.PROMPT ? 'bg-amber-400'
    : 'bg-slate-500'
  const text =
    perm === PERM_STATE.GRANTED ? 'Allowed'
    : perm === PERM_STATE.DENIED ? 'Blocked'
    : perm === PERM_STATE.PROMPT ? 'Not asked'
    : 'Unsupported'
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-white/70">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {text}
    </span>
  )
}
