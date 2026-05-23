import { useCallback, useEffect, useRef, useState } from 'react'
import { WAVEFORM_SAMPLES, MAX_AUDIO_DURATION_SEC } from '@chat/shared'

export interface RecordedAudio {
  blob: Blob
  duration: number
  waveform: number[]
}

interface UseAudioRecorderOptions {
  onAutoStop?: (rec: RecordedAudio) => void
}

const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

const pickMimeType = (): string | undefined => {
  if (typeof MediaRecorder === 'undefined') return undefined
  for (const t of PREFERRED_TYPES) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return undefined
}

export const useAudioRecorder = (options?: UseAudioRecorderOptions) => {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [levels, setLevels] = useState<number[]>([])

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const levelsBufferRef = useRef<number[]>([])
  const sampleAccRef = useRef<{ sum: number; count: number }>({ sum: 0, count: 0 })
  const sampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finishingRef = useRef<{ resolve: (r: RecordedAudio) => void; reject: (e: Error) => void } | null>(null)
  const cancelledRef = useRef(false)
  const autoStopHandlerRef = useRef(options?.onAutoStop)

  useEffect(() => {
    autoStopHandlerRef.current = options?.onAutoStop
  }, [options?.onAutoStop])

  const cleanup = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (sampleTimerRef.current) {
      clearInterval(sampleTimerRef.current)
      sampleTimerRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
    }
    audioCtxRef.current = null
    analyserRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const start = useCallback(async (): Promise<boolean> => {
    if (isRecording) return false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []
      cancelledRef.current = false
      levelsBufferRef.current = []
      sampleAccRef.current = { sum: 0, count: 0 }
      startedAtRef.current = performance.now()
      setDuration(0)
      setLevels([])

      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AC()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
      const data = new Uint8Array(analyser.frequencyBinCount)

      const loop = () => {
        analyser.getByteFrequencyData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i]
        const avg = sum / data.length / 255
        sampleAccRef.current.sum += avg
        sampleAccRef.current.count += 1
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)

      sampleTimerRef.current = setInterval(() => {
        const { sum, count } = sampleAccRef.current
        const v = count > 0 ? sum / count : 0
        sampleAccRef.current = { sum: 0, count: 0 }
        const buf = levelsBufferRef.current
        buf.push(v)
        if (buf.length > WAVEFORM_SAMPLES * 4) buf.shift()
        const tail = buf.slice(-WAVEFORM_SAMPLES)
        const padded = tail.length < WAVEFORM_SAMPLES
          ? [...new Array(WAVEFORM_SAMPLES - tail.length).fill(0), ...tail]
          : tail
        setLevels(padded)
      }, 80)

      tickRef.current = setInterval(() => {
        const d = (performance.now() - startedAtRef.current) / 1000
        setDuration(d)
        if (d >= MAX_AUDIO_DURATION_SEC) {
          stopInternal()
        }
      }, 200)

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        const finalDuration = (performance.now() - startedAtRef.current) / 1000
        const finalWaveform = downsample(levelsBufferRef.current, WAVEFORM_SAMPLES)
        const result: RecordedAudio = { blob, duration: finalDuration, waveform: finalWaveform }
        const waiter = finishingRef.current
        finishingRef.current = null
        cleanup()
        setIsRecording(false)
        setDuration(0)
        setLevels([])
        if (cancelledRef.current) {
          waiter?.reject(new Error('cancelled'))
          return
        }
        waiter?.resolve(result)
        autoStopHandlerRef.current?.(result)
      }

      recorder.start(100)
      setIsRecording(true)
      return true
    } catch (err) {
      cleanup()
      setIsRecording(false)
      throw err
    }
  }, [cleanup, isRecording])

  const stopInternal = useCallback((): Promise<RecordedAudio> => {
    return new Promise((resolve, reject) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        reject(new Error('not recording'))
        return
      }
      finishingRef.current = { resolve, reject }
      recorder.stop()
    })
  }, [])

  const stop = useCallback(() => stopInternal(), [stopInternal])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop() } catch {}
    } else {
      cleanup()
      setIsRecording(false)
      setDuration(0)
      setLevels([])
    }
  }, [cleanup])

  return { isRecording, duration, levels, start, stop, cancel }
}

const downsample = (input: number[], target: number): number[] => {
  if (input.length === 0) return new Array(target).fill(0)
  if (input.length <= target) {
    const pad = target - input.length
    return [...new Array(pad).fill(0), ...input]
  }
  const out: number[] = []
  const bucket = input.length / target
  for (let i = 0; i < target; i++) {
    const start = Math.floor(i * bucket)
    const end = Math.floor((i + 1) * bucket)
    let sum = 0
    for (let j = start; j < end; j++) sum += input[j]
    out.push(sum / Math.max(1, end - start))
  }
  return out
}
