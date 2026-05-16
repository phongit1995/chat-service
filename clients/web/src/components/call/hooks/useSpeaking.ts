import { useEffect, useState } from 'react'
import { ParticipantEvent, type Participant } from 'livekit-client'

export function useSpeaking(p: Participant | undefined): boolean {
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => {
    if (!p) {
      setSpeaking(false)
      return
    }
    const tag = `[speaking ${p.identity?.slice(0, 8) ?? '?'}]`
    console.log(tag, 'mount isSpeaking=', p.isSpeaking, 'audioLevel=', p.audioLevel, 'isLocal=', p.isLocal)
    setSpeaking(p.isSpeaking)
    const onChange = () => {
      console.log(tag, 'IsSpeakingChanged →', p.isSpeaking, 'level=', p.audioLevel)
      setSpeaking(p.isSpeaking)
    }
    const onAudioLevel = () => {
      console.log(tag, 'AudioLevelChanged level=', p.audioLevel, 'isSpeaking=', p.isSpeaking)
    }
    p.on(ParticipantEvent.IsSpeakingChanged, onChange)
    p.on(ParticipantEvent.AudioLevelChanged, onAudioLevel)
    const poll = setInterval(() => {
      console.log(tag, 'tick isSpeaking=', p.isSpeaking, 'level=', p.audioLevel)
    }, 2000)
    return () => {
      p.off(ParticipantEvent.IsSpeakingChanged, onChange)
      p.off(ParticipantEvent.AudioLevelChanged, onAudioLevel)
      clearInterval(poll)
    }
  }, [p])
  return speaking
}
