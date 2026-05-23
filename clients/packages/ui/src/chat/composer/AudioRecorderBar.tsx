interface AudioRecorderBarProps {
  duration: number
  levels: number[]
  onCancel: () => void
  onSend: () => void
}

const formatDuration = (sec: number): string => {
  const s = Math.floor(sec)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${ss.toString().padStart(2, '0')}`
}

export const AudioRecorderBar = ({ duration, levels, onCancel, onSend }: AudioRecorderBarProps) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-surface-overlay border border-line-subtle w-full">
      <span className="relative flex items-center justify-center w-3 h-3 shrink-0">
        <span className="absolute inset-0 rounded-full bg-status-danger animate-ping opacity-60" />
        <span className="relative w-2.5 h-2.5 rounded-full bg-status-danger" />
      </span>

      <div className="flex-1 flex items-center gap-[2px] h-7 min-w-0 overflow-hidden">
        {levels.map((v, i) => {
          const h = Math.max(8, Math.min(100, v * 180))
          return (
            <span
              key={i}
              className="w-[3px] rounded-full bg-primary shrink-0"
              style={{ height: `${h}%` }}
            />
          )
        })}
      </div>

      <span className="text-xs font-medium text-ink-secondary tabular-nums shrink-0 min-w-[36px] text-right">
        {formatDuration(duration)}
      </span>

      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel recording"
        className="w-8 h-8 rounded-full flex items-center justify-center text-ink-tertiary hover:bg-surface hover:text-status-danger transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onSend}
        aria-label="Send recording"
        className="w-9 h-9 rounded-full flex items-center justify-center bg-primary text-white hover:opacity-90 transition-opacity"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  )
}
