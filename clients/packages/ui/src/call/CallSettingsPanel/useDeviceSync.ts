import { useEffect } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { useCallStore } from '@chat/shared'
import { useMediaDevices } from '../hooks/useMediaDevices'
import { DEVICE_KIND } from '../constants'
import type { DeviceKind } from '../interfaces'

export const useDeviceSync = () => {
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

  useEffect(() => {
    if (!room) return
    const apply = (kind: DeviceKind, id: string | null, list: MediaDeviceInfo[]) => {
      if (!id) return
      const stillExists = list.some((d) => d.deviceId === id)
      if (!stillExists) {
        if (kind === DEVICE_KIND.AUDIO_INPUT) setSelectedMicId(null)
        else if (kind === DEVICE_KIND.VIDEO_INPUT) setSelectedCamId(null)
        else setSelectedSpeakerId(null)
        return
      }
      room.switchActiveDevice(kind, id).catch((e) => {
        console.warn(`[settings] switch ${kind} failed`, e)
      })
    }
    apply(DEVICE_KIND.AUDIO_INPUT, selectedMicId, devices.audioinput)
    apply(DEVICE_KIND.VIDEO_INPUT, selectedCamId, devices.videoinput)
    apply(DEVICE_KIND.AUDIO_OUTPUT, selectedSpeakerId, devices.audiooutput)
  }, [room, selectedMicId, selectedCamId, selectedSpeakerId, devices, setSelectedMicId, setSelectedCamId, setSelectedSpeakerId])

  return { room, devices, selectedMicId, selectedCamId, selectedSpeakerId, setSelectedMicId, setSelectedCamId, setSelectedSpeakerId }
}
