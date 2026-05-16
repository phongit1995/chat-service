interface CallHeaderProps {
  name: string
  statusLabel: string
  isVideo: boolean
  onMinimize: () => void
}

export const CallHeader = ({ name, statusLabel, isVideo, onMinimize }: CallHeaderProps) => (
  <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black/60 via-black/30 to-transparent pointer-events-none">
    <button
      onClick={onMinimize}
      title="Minimize"
      className="p-2 rounded-full bg-white/15 hover:bg-white/30 text-white transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95 pointer-events-auto backdrop-blur-sm"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    </button>
    <div className="text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
      <h2 className="font-semibold text-lg text-white">{name}</h2>
      <p className="text-sm text-white/90 font-medium mt-0.5">{statusLabel}</p>
    </div>
    <span className="text-[11px] uppercase tracking-wider text-white/80 font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
      {isVideo ? 'Video call' : 'Voice call'}
    </span>
  </div>
)
