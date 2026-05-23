import { useEffect, useMemo, useRef, useState } from 'react'
import { setCurrent, setSpeed, useAudioSpeed, useCurrentAudioId } from './audioPlayback'

interface MessageAudioBubbleProps {
  messageId: string
  metadata?: string
  isOwnMessage: boolean
}

interface AudioMeta {
  url: string
  duration: number
  waveform?: number[]
  mimeType?: string
}

const parseMeta = (raw?: string): AudioMeta | null => {
  if (!raw) return null
  try {
    const m = JSON.parse(raw)
    if (!m.url) return null
    return {
      url: m.url,
      duration: Number(m.duration ?? 0),
      waveform: Array.isArray(m.waveform) ? m.waveform : undefined,
      mimeType: m.mimeType,
    }
  } catch {
    return null
  }
}

const formatTime = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${ss.toString().padStart(2, '0')}`
}

const SPEED_CYCLE = [1, 1.5, 2] as const

export const MessageAudioBubble = ({ messageId, metadata, isOwnMessage }: MessageAudioBubbleProps) => {
  const meta = useMemo(() => parseMeta(metadata), [metadata])
  const currentId = useCurrentAudioId()
  const speed = useAudioSpeed()

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [playing, setPlaying] = useState(false)

  const isActive = currentId === messageId
  const bars = meta?.waveform && meta.waveform.length > 0 ? meta.waveform : new Array(40).fill(0.3)
  const totalDuration = meta?.duration || (audioRef.current?.duration && Number.isFinite(audioRef.current.duration) ? audioRef.current.duration : 0)
  const progress = totalDuration > 0 ? Math.min(1, position / totalDuration) : 0

  useEffect(() => {
    if (!isActive && playing && audioRef.current) {
      audioRef.current.pause()
      setPlaying(false)
    }
  }, [isActive, playing])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  if (!meta) {
    return (
      <div className={`px-3 py-2 rounded-2xl text-sm ${isOwnMessage ? 'bg-primary text-white' : 'bg-surface text-ink-primary'}`}>
        🎵 Audio unavailable
      </div>
    )
  }

  const togglePlay = async () => {
    const el = audioRef.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
      return
    }
    setCurrent(messageId)
    el.playbackRate = speed
    try {
      await el.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current
    const wf = waveformRef.current
    if (!el || !wf || !totalDuration) return
    const rect = wf.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    el.currentTime = Math.max(0, Math.min(totalDuration, ratio * totalDuration))
  }

  const cycleSpeed = () => {
    const idx = SPEED_CYCLE.indexOf(speed as 1 | 1.5 | 2)
    const next = SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length]
    setSpeed(next)
  }

  const tint = isOwnMessage ? 'text-white' : 'text-ink-primary'
  const bg = isOwnMessage ? 'bg-primary' : 'bg-surface'
  const activeBar = isOwnMessage ? 'bg-white' : 'bg-primary'
  const inactiveBar = isOwnMessage ? 'bg-white/40' : 'bg-ink-tertiary/50'

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-2xl ${bg} ${tint} min-w-[220px] max-w-[280px]`}>
      <audio
        ref={audioRef}
        src={meta.url}
        preload="metadata"
        onLoadedMetadata={() => setLoaded(true)}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onEnded={() => {
          setPlaying(false)
          setPosition(0)
        }}
        onPause={() => setPlaying(false)}
      />

      <button
        type="button"
        onClick={togglePlay}
        disabled={!loaded && !meta.duration}
        aria-label={playing ? 'Pause' : 'Play'}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isOwnMessage ? 'bg-white/20 hover:bg-white/30' : 'bg-primary/15 hover:bg-primary/25'} transition-colors`}
      >
        {playing ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          ref={waveformRef}
          onClick={onSeek}
          className="flex items-center gap-[2px] h-6 cursor-pointer"
        >
          {bars.map((v, i) => {
            const filled = i / bars.length < progress
            const h = Math.max(20, Math.min(100, (typeof v === 'number' ? v : 0.3) * 220))
            return (
              <span
                key={i}
                className={`flex-1 min-w-[2px] rounded-full ${filled ? activeBar : inactiveBar}`}
                style={{ height: `${h}%` }}
              />
            )
          })}
        </div>
        <div className={`mt-0.5 text-[10px] ${isOwnMessage ? 'text-white/80' : 'text-ink-tertiary'} tabular-nums`}>
          {playing || position > 0 ? formatTime(position) : formatTime(totalDuration)}
        </div>
      </div>

      <button
        type="button"
        onClick={cycleSpeed}
        aria-label="Playback speed"
        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isOwnMessage ? 'bg-white/15 hover:bg-white/25' : 'bg-ink-tertiary/10 hover:bg-ink-tertiary/20'} shrink-0`}
      >
        {speed}x
      </button>
    </div>
  )
}
