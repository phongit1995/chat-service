import type { ReactNode } from 'react'
import { PermBadge } from './PermBadge'
import type { PermState } from '../interfaces'

interface DeviceSectionProps {
  label: string
  perm?: PermState
  devices: MediaDeviceInfo[]
  selectedId: string | null
  onChange: (id: string) => void
  extra?: ReactNode
}

export const DeviceSection = ({ label, perm, devices, selectedId, onChange, extra }: DeviceSectionProps) => {
  const empty = devices.length === 0
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs uppercase tracking-wider text-white/60 font-medium">{label}</span>
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
      {!empty && extra}
    </div>
  )
}
