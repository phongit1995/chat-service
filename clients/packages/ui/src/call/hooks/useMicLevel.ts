import { useEffect, useRef } from 'react'
import { ParticipantEvent, Track, TrackEvent, type LocalTrack, type Participant } from 'livekit-client'

export interface MicLevelBands {
  subscribe: (cb: (bands: number[]) => void) => () => void
  current: () => number[]
}

const NUM_BANDS = 3
const FIRST_BIN = 3
const BINS_PER_BAND = 5
const NOISE_FLOOR = 0.18
const GAIN = 2.2
const ATTACK = 0.55
const RELEASE = 0.12
const SILENCE_EPS = 0.01

const RESYNC_EVENTS = [
  ParticipantEvent.TrackPublished,
  ParticipantEvent.LocalTrackPublished,
  ParticipantEvent.TrackUnpublished,
  ParticipantEvent.LocalTrackUnpublished,
  ParticipantEvent.TrackMuted,
  ParticipantEvent.TrackUnmuted,
  ParticipantEvent.TrackSubscribed,
] as const

interface Analyser {
  ctx: AudioContext
  node: AnalyserNode
  source: MediaStreamAudioSourceNode
  freqBuf: Uint8Array<ArrayBuffer>
}

const createAnalyser = (mst: MediaStreamTrack): Analyser => {
  const AC = window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AC()
  const node = ctx.createAnalyser()
  node.fftSize = 256
  node.smoothingTimeConstant = 0.6
  const freqBuf = new Uint8Array(new ArrayBuffer(node.frequencyBinCount))
  const source = ctx.createMediaStreamSource(new MediaStream([mst]))
  source.connect(node)
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return { ctx, node, source, freqBuf }
}

const computeBands = (freqBuf: Uint8Array<ArrayBuffer>, smoothed: number[]): number[] => {
  const next = new Array<number>(NUM_BANDS)
  for (let band = 0; band < NUM_BANDS; band++) {
    let sum = 0
    const start = FIRST_BIN + band * BINS_PER_BAND
    for (let i = start; i < start + BINS_PER_BAND; i++) sum += freqBuf[i]
    const avg = sum / BINS_PER_BAND / 255
    const target = Math.min(1, Math.max(0, avg - NOISE_FLOOR) * GAIN)
    const prev = smoothed[band]
    const k = target > prev ? ATTACK : RELEASE
    smoothed[band] = prev + (target - prev) * k
    next[band] = smoothed[band] < SILENCE_EPS ? 0 : smoothed[band]
  }
  return next
}

const getMst = (track: unknown): MediaStreamTrack | undefined =>
  (track as { mediaStreamTrack?: MediaStreamTrack })?.mediaStreamTrack

export function useMicLevel(p: Participant | undefined): MicLevelBands {
  const subsRef = useRef<Set<(bands: number[]) => void>>(new Set())
  const bandsRef = useRef<number[]>(new Array(NUM_BANDS).fill(0))

  const apiRef = useRef<MicLevelBands>({
    subscribe: (cb) => {
      subsRef.current.add(cb)
      cb(bandsRef.current)
      return () => { subsRef.current.delete(cb) }
    },
    current: () => bandsRef.current,
  })

  useEffect(() => {
    if (!p) return

    let analyser: Analyser | null = null
    let attachedMst: MediaStreamTrack | null = null
    let listenedTrack: LocalTrack | null = null
    let onRestart: (() => void) | null = null
    let rafId: number | null = null
    const smoothed = new Array(NUM_BANDS).fill(0)

    const broadcast = (bands: number[]) => {
      bandsRef.current = bands
      subsRef.current.forEach((cb) => cb(bands))
    }

    const tick = () => {
      if (!analyser) return
      analyser.node.getByteFrequencyData(analyser.freqBuf)
      broadcast(computeBands(analyser.freqBuf, smoothed))
      rafId = requestAnimationFrame(tick)
    }

    const detach = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
      if (listenedTrack && onRestart) {
        try { listenedTrack.off(TrackEvent.Restarted, onRestart) } catch {}
      }
      listenedTrack = null
      onRestart = null
      if (analyser) {
        try { analyser.source.disconnect() } catch {}
        try { analyser.node.disconnect() } catch {}
        try { analyser.ctx.close() } catch {}
      }
      analyser = null
      attachedMst = null
      smoothed.fill(0)
      broadcast(new Array(NUM_BANDS).fill(0))
    }

    const sync = () => {
      const pub = p.getTrackPublication(Track.Source.Microphone)
      if (!pub?.track) { detach(); return }
      const mst = getMst(pub.track)
      if (!mst) return
      if (attachedMst === mst && analyser) return
      detach()
      try {
        analyser = createAnalyser(mst)
        attachedMst = mst
        listenedTrack = pub.track as LocalTrack
        onRestart = sync
        listenedTrack.on(TrackEvent.Restarted, onRestart)
        rafId = requestAnimationFrame(tick)
      } catch (err) {
        console.warn('[useMicLevel] attach failed', err)
        detach()
      }
    }

    sync()
    RESYNC_EVENTS.forEach((e) => p.on(e, sync))
    return () => {
      RESYNC_EVENTS.forEach((e) => p.off(e, sync))
      detach()
    }
  }, [p])

  return apiRef.current
}
