import toast from 'react-hot-toast'
import { useLocalParticipant } from '@livekit/components-react'
import { useMicLevel } from '../hooks/useMicLevel'
import { usePermissionStatus } from '../hooks/usePermissionStatus'
import { MicLiveIcon } from '../MicLiveIcon'
import { DEVICE_KIND, PERM_MIC, PERM_CAM } from '../constants'
import type { DeviceKind } from '../interfaces'
import { DeviceSection } from './DeviceSection'
import { useDeviceSync } from './useDeviceSync'
import { deviceKindLabel } from './CallSettingsPanel.types'
import type { CallSettingsPanelProps } from './CallSettingsPanel.types'

export type { CallSettingsPanelProps } from './CallSettingsPanel.types'

export const CallSettingsPanel = ({ open, onClose }: CallSettingsPanelProps) => {
  const { localParticipant } = useLocalParticipant()
  const micBands = useMicLevel(localParticipant)
  const micPerm = usePermissionStatus(PERM_MIC)
  const camPerm = usePermissionStatus(PERM_CAM)
  const { room, devices, selectedMicId, selectedCamId, selectedSpeakerId, setSelectedMicId, setSelectedCamId, setSelectedSpeakerId } = useDeviceSync()

  const change = async (kind: DeviceKind, id: string) => {
    if (kind === DEVICE_KIND.AUDIO_INPUT) setSelectedMicId(id)
    else if (kind === DEVICE_KIND.VIDEO_INPUT) setSelectedCamId(id)
    else setSelectedSpeakerId(id)
    if (!room) {
      toast.error(`Cannot switch ${deviceKindLabel(kind)} — call not connected`)
      return
    }
    try {
      await room.switchActiveDevice(kind, id)
    } catch (e) {
      const msg = (e as Error)?.message || 'unknown error'
      toast.error(`Failed to switch ${deviceKindLabel(kind)}: ${msg}`)
      console.warn(`[settings] switch ${kind} failed`, e)
    }
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
            extra={
              <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
                <MicLiveIcon bands={micBands} className="w-5 h-5 text-white/80" />
                <span>Speak to test — bars react to the selected mic</span>
              </div>
            }
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
