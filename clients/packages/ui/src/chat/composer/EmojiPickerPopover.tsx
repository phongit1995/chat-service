import { lazy, Suspense, useEffect, useRef, useState } from 'react'

const EmojiPicker = lazy(() => import('emoji-picker-react'))

interface EmojiPickerPopoverProps {
  onSelect: (emoji: string) => void
}

export const EmojiPickerPopover = ({ onSelect }: EmojiPickerPopoverProps) => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Insert emoji"
        className="w-10 h-10 rounded-full flex items-center justify-center text-2xl hover:bg-surface-overlay transition-colors"
      >
        <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-12 right-0 z-50 shadow-2xl rounded-lg overflow-hidden">
          <Suspense fallback={<div className="w-[340px] h-[440px] bg-surface flex items-center justify-center text-text-muted">Loading…</div>}>
            <EmojiPicker
              onEmojiClick={(e) => {
                onSelect(e.emoji)
                setOpen(false)
              }}
              width={340}
              height={440}
              lazyLoadEmojis
              emojiStyle={'native' as never}
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}
