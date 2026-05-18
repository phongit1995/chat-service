import { useEffect, useState } from 'react'
import { ParticipantEvent, Track, type Participant } from 'livekit-client'

const SPEAKING_THRESHOLD = 0.02
const SILENCE_DEBOUNCE_MS = 500

export function useSpeaking(p: Participant | undefined): boolean {
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    if (!p) {
      setSpeaking(false)
      return
    }

    let ctx: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let source: MediaStreamAudioSourceNode | null = null
    let rafId: number | null = null
    let lastAboveThreshold = 0
    let attachedTrackSid: string | null = null

    const buffer = new Uint8Array(256)

    const detach = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
      try { source?.disconnect() } catch {}
      try { analyser?.disconnect() } catch {}
      try { ctx?.close() } catch {}
      ctx = null
      analyser = null
      source = null
      attachedTrackSid = null
    }

    const tick = () => {
      if (!analyser) return
      analyser.getByteTimeDomainData(buffer)
      let sumSq = 0
      for (let i = 0; i < buffer.length; i++) {
        const v = (buffer[i] - 128) / 128
        sumSq += v * v
      }
      const rms = Math.sqrt(sumSq / buffer.length)
      const now = performance.now()
      if (rms > SPEAKING_THRESHOLD) {
        lastAboveThreshold = now
        if (!speakingRef.value) {
          speakingRef.value = true
          setSpeaking(true)
        }
      } else if (speakingRef.value && now - lastAboveThreshold > SILENCE_DEBOUNCE_MS) {
        speakingRef.value = false
        setSpeaking(false)
      }
      rafId = requestAnimationFrame(tick)
    }

    const speakingRef = { value: false }

    const attach = (stream: MediaStream | null, trackSid: string) => {
      if (!stream || stream.getAudioTracks().length === 0) return
      if (attachedTrackSid === trackSid && ctx) return
      detach()
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctx = new AC()
        analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.4
        source = ctx.createMediaStreamSource(stream)
        source.connect(analyser)
        attachedTrackSid = trackSid
        rafId = requestAnimationFrame(tick)
      } catch (err) {
        console.warn('[useSpeaking] failed to attach analyser', err)
        detach()
      }
    }

    const tryAttach = () => {
      const pub = p.getTrackPublication(Track.Source.Microphone)
      if (!pub || !pub.track || pub.isMuted) {
        if (speakingRef.value) {
          speakingRef.value = false
          setSpeaking(false)
        }
        detach()
        return
      }
      const mediaStreamTrack = (pub.track as { mediaStreamTrack?: MediaStreamTrack }).mediaStreamTrack
      if (!mediaStreamTrack) return
      const stream = new MediaStream([mediaStreamTrack])
      attach(stream, pub.trackSid)
    }

    tryAttach()
    const onPub = () => tryAttach()
    const onUnpub = () => tryAttach()
    const onMute = () => tryAttach()
    const onUnmute = () => tryAttach()
    const onSub = () => tryAttach()
    p.on(ParticipantEvent.TrackPublished, onPub)
    p.on(ParticipantEvent.LocalTrackPublished, onPub)
    p.on(ParticipantEvent.TrackUnpublished, onUnpub)
    p.on(ParticipantEvent.LocalTrackUnpublished, onUnpub)
    p.on(ParticipantEvent.TrackMuted, onMute)
    p.on(ParticipantEvent.TrackUnmuted, onUnmute)
    p.on(ParticipantEvent.TrackSubscribed, onSub)

    return () => {
      p.off(ParticipantEvent.TrackPublished, onPub)
      p.off(ParticipantEvent.LocalTrackPublished, onPub)
      p.off(ParticipantEvent.TrackUnpublished, onUnpub)
      p.off(ParticipantEvent.LocalTrackUnpublished, onUnpub)
      p.off(ParticipantEvent.TrackMuted, onMute)
      p.off(ParticipantEvent.TrackUnmuted, onUnmute)
      p.off(ParticipantEvent.TrackSubscribed, onSub)
      detach()
    }
  }, [p])

  return speaking
}
