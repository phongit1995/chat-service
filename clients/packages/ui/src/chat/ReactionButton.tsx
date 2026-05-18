import { useEffect, useRef, useState } from 'react'
import { REACTION_EMOJIS } from '@chat/shared'
import { ReactionPicker } from './ReactionPicker'

interface ReactionButtonProps {
  reactions?: Record<string, string[]>
  visible: boolean
  myUserId: string
  isOwnMessage?: boolean
  onSelect: (type: string) => void
}

export const ReactionButton = ({ reactions, visible, myUserId, isOwnMessage = false, onSelect }: ReactionButtonProps) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const entries = reactions ? Object.entries(reactions).filter(([, u]) => u.length > 0) : []
  const hasReactions = entries.length > 0
  const myReactedTypes = entries.filter(([, u]) => u.includes(myUserId)).map(([t]) => t)
  const totalCount = entries.reduce((s, [, u]) => s + u.length, 0)
  const firstType = hasReactions ? entries[0][0] : null
  const firstEmoji = firstType ? (REACTION_EMOJIS as Record<string, string>)[firstType] : null

  if (!hasReactions && !visible && !open) return null

  return (
    <div
      ref={wrapRef}
      className="absolute -bottom-3 -right-2 z-10"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {open && (
        <div className={`absolute bottom-full pb-2 ${isOwnMessage ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
          <ReactionPicker
            myReactedTypes={myReactedTypes}
            onSelect={(type) => {
              onSelect(type)
              setOpen(false)
            }}
          />
        </div>
      )}
      <button
        type="button"
        aria-label={hasReactions ? 'Change reaction' : 'Add reaction'}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onMouseEnter={() => setOpen(true)}
        className={`flex items-center gap-0.5 rounded-full bg-surface shadow-soft-sm border border-line-subtle hover:scale-110 active:scale-95 transition-transform ${
          hasReactions
            ? 'h-6 px-1.5 text-[12px]'
            : 'w-6 h-6 justify-center text-ink-tertiary hover:text-ink-primary'
        }`}
      >
        {hasReactions ? (
          <>
            <span className="text-[14px] leading-none">{firstEmoji}</span>
            {totalCount > 1 && (
              <span className="text-ink-secondary font-medium">{totalCount}</span>
            )}
          </>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 7v3m-1.5-1.5h3" />
          </svg>
        )}
      </button>
    </div>
  )
}
