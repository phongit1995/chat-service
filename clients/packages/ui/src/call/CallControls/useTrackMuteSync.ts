import { useEffect } from 'react'
import { useLocalParticipant } from '@livekit/components-react'
import { ParticipantEvent } from 'livekit-client'
import type { MediaSource } from '../lib/callMedia'

export const useTrackMuteSync = (source: MediaSource, muted: boolean) => {
  const { localParticipant } = useLocalParticipant()
  useEffect(() => {
    const apply = () => {
      const pub = localParticipant.getTrackPublication(source)
      if (!pub?.track) return
      if (muted && !pub.track.isMuted) pub.track.mute()
      else if (!muted && pub.track.isMuted) pub.track.unmute()
    }
    apply()
    localParticipant.on(ParticipantEvent.LocalTrackPublished, apply)
    return () => {
      localParticipant.off(ParticipantEvent.LocalTrackPublished, apply)
    }
  }, [localParticipant, source, muted])
}
