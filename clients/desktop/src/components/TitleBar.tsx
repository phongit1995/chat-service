import { useEffect, useState } from 'react'

export const TitleBar = () => {
  const [platform, setPlatform] = useState<string>('')

  useEffect(() => {
    window.desktop.getPlatform().then(setPlatform)
  }, [])

  const isMac = platform === 'darwin'

  return (
    <div
      className="h-8 flex items-center justify-center select-none bg-gradient-signature text-white text-[13px] font-semibold tracking-wide shadow-soft-sm"
      style={{ WebkitAppRegion: 'drag', paddingLeft: isMac ? 80 : 12, paddingRight: isMac ? 12 : 0 } as React.CSSProperties}
    >
      <span className="flex-1 text-center">Chat</span>

      {!isMac && (
        <div
          className="flex items-center h-full"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => window.desktop.minimize()}
            className="w-11 h-full hover:bg-white/15 transition-colors flex items-center justify-center"
            aria-label="Minimize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" /></svg>
          </button>
          <button
            onClick={() => window.desktop.maximize()}
            className="w-11 h-full hover:bg-white/15 transition-colors flex items-center justify-center"
            aria-label="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
          </button>
          <button
            onClick={() => window.desktop.close()}
            className="w-11 h-full hover:bg-red-500 transition-colors flex items-center justify-center"
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0,0 L10,10 M10,0 L0,10" stroke="currentColor" strokeWidth="1" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}
