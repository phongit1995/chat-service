interface MicBadgeProps {
  muted: boolean
  speaking: boolean
}

export const MicBadge = ({ muted, speaking }: MicBadgeProps) => {
  const bg = muted ? 'bg-red-500' : speaking ? 'bg-green-500' : 'bg-black/60'
  const ring = speaking && !muted ? 'ring-2 ring-green-300/80 animate-pulse' : ''
  return (
    <div
      className={`absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full ${bg} ${ring} flex items-center justify-center shadow-md pointer-events-none transition-colors duration-200`}
    >
      {muted ? (
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      )}
    </div>
  )
}
