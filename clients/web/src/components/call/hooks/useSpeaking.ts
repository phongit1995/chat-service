import { useEffect, useState } from 'react'
import { ParticipantEvent, type Participant } from 'livekit-client'

export function useSpeaking(p: Participant | undefined): boolean {
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => {
    if (!p) {
      setSpeaking(false)
      return
    }
    setSpeaking(p.isSpeaking)
    const onChange = () => setSpeaking(p.isSpeaking)
    p.on(ParticipantEvent.IsSpeakingChanged, onChange)
    return () => {
      p.off(ParticipantEvent.IsSpeakingChanged, onChange)
    }
  }, [p])
  return speaking
}
