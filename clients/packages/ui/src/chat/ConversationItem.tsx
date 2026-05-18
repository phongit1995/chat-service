import { useRef, useState } from 'react'
import { Conversation } from '@chat/shared'
import { Avatar } from '../common'

// ── Emoji helpers for last-message preview ───────────────────────────────────
const isEmojiGrapheme = (g: string): boolean => {
  if (!g || /^\s+$/.test(g)) return false
  for (const ch of g) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) return false
    if (cp === 0x200d || cp === 0xfe0f || cp === 0x20e3) continue
    if (cp >= 0x1f1e6 && cp <= 0x1f1ff) continue
    if (cp >= 0x1f3fb && cp <= 0x1f3ff) continue
    if (cp >= 0x2300 && cp <= 0x27bf) continue
    if (cp >= 0x2b00 && cp <= 0x2bff) continue
    if (cp >= 0x1f000 && cp <= 0x1faff) continue
    if (cp === 0x00a9 || cp === 0x00ae) continue
    if (cp >= 0x203c && cp <= 0x2049) continue
    return false
  }
  return true
}

type Seg = { text: string; isEmoji: boolean }
const splitSegments = (text: string): Seg[] => {
  const SegCtor = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter
  const graphemes: Seg[] = []
  if (SegCtor) {
    const seg = new SegCtor(undefined, { granularity: 'grapheme' })
    for (const p of seg.segment(text)) graphemes.push({ text: p.segment, isEmoji: isEmojiGrapheme(p.segment) })
  } else {
    for (const ch of text) graphemes.push({ text: ch, isEmoji: isEmojiGrapheme(ch) })
  }
  const segs: Seg[] = []
  for (const g of graphemes) {
    const last = segs[segs.length - 1]
    if (last && last.isEmoji === g.isEmoji) last.text += g.text
    else segs.push({ text: g.text, isEmoji: g.isEmoji })
  }
  return segs
}

const RichText = ({ text }: { text: string }) => (
  <>
    {splitSegments(text).map((seg, i) =>
      seg.isEmoji
        ? <span key={i} style={{ fontSize: '1.25em', lineHeight: 1, verticalAlign: 'middle' }}>{seg.text}</span>
        : <span key={i}>{seg.text}</span>
    )}
  </>
)

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
  onHide?: () => void
}

const HIDE_THRESHOLD = 100

export const ConversationItem = ({
  conversation,
  isActive,
  onClick,
  onHide,
}: ConversationItemProps) => {
  const hasUnread = (conversation.unreadCount || 0) > 0
  const isOnline = conversation.type === 'direct' && !!conversation.otherUser?.isOnline

  const [offset, setOffset] = useState(0)
  const startX = useRef<number | null>(null)
  const dragging = useRef(false)
  const moved = useRef(false)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onHide) return
    // Only react to primary mouse button / touch / pen
    if (e.pointerType === 'mouse' && e.button !== 0) return
    startX.current = e.clientX
    dragging.current = true
    moved.current = false
    // Don't capture pointer yet — wait until user actually drags > 5px.
    // Capturing immediately would swallow the click event.
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || startX.current === null) return
    const dx = e.clientX - startX.current
    if (Math.abs(dx) > 5) {
      if (!moved.current) {
        moved.current = true
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {}
      }
    }
    if (dx < 0) {
      setOffset(Math.max(dx, -180))
    } else if (offset < 0) {
      setOffset(0)
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    if (moved.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
    }
    if (offset <= -HIDE_THRESHOLD && onHide) {
      setOffset(-400)
      setTimeout(onHide, 180)
    } else {
      setOffset(0)
    }
  }

  const handleClick = () => {
    if (moved.current) return
    onClick()
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const diffMs = Date.now() - date.getTime()
    const m = Math.floor(diffMs / 60000)
    const h = Math.floor(diffMs / 3600000)
    const d = Math.floor(diffMs / 86400000)
    if (m < 1) return 'now'
    if (m < 60) return `${m}m`
    if (h < 24) return `${h}h`
    if (d < 7) return `${d}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const displayName =
    conversation.name || (conversation.type === 'group' ? 'Group Chat' : 'Unknown')

  const willHide = offset <= -HIDE_THRESHOLD

  return (
    <div className="relative overflow-hidden rounded-xl mb-1.5">
      {onHide && (
        <div
          className={[
            'absolute inset-y-0 right-0 flex items-center justify-end pr-4 select-none transition-colors',
            willHide ? 'bg-red-500' : 'bg-red-400/80',
          ].join(' ')}
          style={{ width: Math.min(-offset, 180) }}
        >
          <span className="text-white text-xs font-semibold uppercase tracking-wide">
            {willHide ? 'Release to hide' : 'Hide'}
          </span>
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging.current ? 'none' : 'transform 180ms ease',
          touchAction: 'pan-y',
        }}
      >
        <button
          onClick={handleClick}
          className={[
            'w-full p-3 rounded-xl text-left group',
            'transition-[background,box-shadow] duration-fast ease-ease-smooth',
            isActive
              ? 'bg-gradient-soft shadow-soft-md'
              : 'hover:bg-surface-overlay active:bg-surface-elevated bg-surface',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            <Avatar
              src={conversation.avatar}
              name={displayName}
              size="lg"
              storyRing={hasUnread}
              storyRingSeen={!hasUnread}
              status={isOnline ? 'online' : undefined}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h4
                  className={`truncate font-semibold ${
                    hasUnread ? 'text-ink-primary' : 'text-ink-primary'
                  }`}
                >
                  {displayName}
                </h4>
                {conversation.lastMessageAt && (
                  <span
                    className={`text-[11px] ml-2 flex-shrink-0 ${
                      hasUnread ? 'text-primary-500 font-semibold' : 'text-ink-tertiary'
                    }`}
                  >
                    {formatTime(conversation.lastMessageAt)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                {conversation.lastMessageText ? (
                  <p
                    className={`text-[13px] truncate flex-1 ${
                      hasUnread ? 'font-semibold text-ink-primary' : 'text-ink-secondary'
                    }`}
                  >
                    {conversation.isLastMessageFromMe ? (
                      <span className="text-ink-tertiary">You: </span>
                    ) : conversation.type === 'group' && conversation.lastMessageSenderName ? (
                      <span className="text-ink-tertiary">
                        {conversation.lastMessageSenderName}:{' '}
                      </span>
                    ) : null}
                    <RichText text={conversation.lastMessageText} />
                  </p>
                ) : (
                  <p className="text-[13px] text-ink-tertiary italic flex-1">No messages yet</p>
                )}

                {hasUnread ? (
                  <span className="bg-gradient-signature text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-2 flex-shrink-0 shadow-glow-gradient animate-scaleIn">
                    {conversation.unreadCount! > 99 ? '99+' : conversation.unreadCount}
                  </span>
                ) : conversation.isLastMessageFromMe && conversation.seen ? (
                  <span title="Seen" className="text-primary-500 text-[13px] flex-shrink-0">
                    ✓✓
                  </span>
                ) : conversation.isLastMessageFromMe ? (
                  <span title="Sent" className="text-ink-tertiary text-[13px] flex-shrink-0">
                    ✓
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
