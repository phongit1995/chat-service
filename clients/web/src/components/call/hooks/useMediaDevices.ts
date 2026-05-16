import { useEffect, useState } from 'react'
import { DEVICE_KIND } from '../constants'
import type { DeviceList } from '../interfaces'

export type { DeviceKind, DeviceList } from '../interfaces'

const EMPTY: DeviceList = { audioinput: [], videoinput: [], audiooutput: [] }

export function useMediaDevices(): DeviceList {
  const [devices, setDevices] = useState<DeviceList>(EMPTY)

  useEffect(() => {
    const refresh = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices()
        setDevices({
          audioinput: list.filter((d) => d.kind === DEVICE_KIND.AUDIO_INPUT),
          videoinput: list.filter((d) => d.kind === DEVICE_KIND.VIDEO_INPUT),
          audiooutput: list.filter((d) => d.kind === DEVICE_KIND.AUDIO_OUTPUT),
        })
      } catch {
        setDevices(EMPTY)
      }
    }
    refresh()
    navigator.mediaDevices.addEventListener('devicechange', refresh)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', refresh)
    }
  }, [])

  return devices
}
