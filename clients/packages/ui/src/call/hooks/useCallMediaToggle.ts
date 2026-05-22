import { useLocalParticipant } from '@livekit/components-react'
import { Track } from 'livekit-client'
import toast from 'react-hot-toast'
import { useCallStore } from '@chat/shared'
import { requestAndPublish, permDeniedHint, type MediaSource } from '../lib/callMedia'
import { usePermissionStatus } from './usePermissionStatus'
import { PERM_MIC, PERM_CAM, PERM_STATE, REQUEST_RESULT } from '../constants'
import type { PermState } from '../interfaces'

export function useCallMediaToggle() {
  const { localParticipant } = useLocalParticipant()
  const { micMuted, camOff, setMicMuted, setCamOff } = useCallStore()
  const micPerm = usePermissionStatus(PERM_MIC)
  const camPerm = usePermissionStatus(PERM_CAM)

  const toggleSource = async (
    source: MediaSource,
    perm: PermState,
    muted: boolean,
    setMuted: (m: boolean) => void,
  ) => {
    if (perm === PERM_STATE.DENIED) {
      toast.error(permDeniedHint(source))
      return
    }
    const pub = localParticipant.getTrackPublication(source)
    if (!pub?.track) {
      const result = await requestAndPublish(localParticipant, source)
      if (result === REQUEST_RESULT.DENIED) toast.error(permDeniedHint(source))
      else if (result === REQUEST_RESULT.GRANTED) setMuted(false)
      return
    }
    const next = !muted
    setMuted(next)
    if (next) pub.track.mute()
    else pub.track.unmute()
  }

  const toggleMic = () => toggleSource(Track.Source.Microphone, micPerm, micMuted, setMicMuted)
  const toggleCam = () => toggleSource(Track.Source.Camera, camPerm, camOff, setCamOff)

  return { localParticipant, micMuted, camOff, micPerm, camPerm, toggleMic, toggleCam }
}
