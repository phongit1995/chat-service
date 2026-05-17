import { useEffect, useState } from 'react'
import { ParticipantEvent, Track, type Participant } from 'livekit-client'

/**
 * Returns a normalized mic level in [0, 1], updated at ~60Hz.
 * Reads directly from the local mic MediaStreamTrack via Web Audio API —
 * does not depend on LiveKit server speaker signals.
 */
export function useMicLevel(p: Participant | undefined): number {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    if (!p) {
      setLevel(0)
      return
    }
    let ctx: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let source: MediaStreamAudioSourceNode | null = null
    let rafId: number | null = null
    let attachedSid: string | null = null
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
      attachedSid = null
      setLevel(0)
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
      const normalized = Math.min(1, rms * 10)
      setLevel(normalized)
      rafId = requestAnimationFrame(tick)
    }

    const tryAttach = () => {
      const pub = p.getTrackPublication(Track.Source.Microphone)
      if (!pub?.track) {
        detach()
        return
      }
      const mst = (pub.track as { mediaStreamTrack?: MediaStreamTrack }).mediaStreamTrack
      if (!mst) return
      if (attachedSid === pub.trackSid && ctx) return
      detach()
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctx = new AC()
        analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.3
        source = ctx.createMediaStreamSource(new MediaStream([mst]))
        source.connect(analyser)
        attachedSid = pub.trackSid
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
        rafId = requestAnimationFrame(tick)
      } catch (err) {
        console.warn('[useMicLevel] failed', err)
        detach()
      }
    }

    tryAttach()
    const handler = () => tryAttach()
    p.on(ParticipantEvent.TrackPublished, handler)
    p.on(ParticipantEvent.LocalTrackPublished, handler)
    p.on(ParticipantEvent.TrackUnpublished, handler)
    p.on(ParticipantEvent.LocalTrackUnpublished, handler)
    p.on(ParticipantEvent.TrackMuted, handler)
    p.on(ParticipantEvent.TrackUnmuted, handler)
    p.on(ParticipantEvent.TrackSubscribed, handler)
    return () => {
      p.off(ParticipantEvent.TrackPublished, handler)
      p.off(ParticipantEvent.LocalTrackPublished, handler)
      p.off(ParticipantEvent.TrackUnpublished, handler)
      p.off(ParticipantEvent.LocalTrackUnpublished, handler)
      p.off(ParticipantEvent.TrackMuted, handler)
      p.off(ParticipantEvent.TrackUnmuted, handler)
      p.off(ParticipantEvent.TrackSubscribed, handler)
      detach()
    }
  }, [p])

  return level
}
