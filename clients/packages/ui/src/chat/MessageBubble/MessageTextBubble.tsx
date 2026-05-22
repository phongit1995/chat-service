import type { Message } from '@chat/shared'
import { splitIntoSegments, MessageStatus as MsgStatus } from '@chat/shared'

interface MessageTextBubbleProps {
  message: Message
  isOwnMessage: boolean
  isFirstInStreak: boolean
  radius: string
}

export const MessageTextBubble = ({
  message,
  isOwnMessage,
  isFirstInStreak,
  radius,
}: MessageTextBubbleProps) => (
  <div
    style={{ borderRadius: radius }}
    className={[
      'break-words',
      'px-3.5 py-2 shadow-soft-sm',
      isOwnMessage ? 'bg-gradient-signature text-on-gradient' : 'bg-surface-overlay text-ink-primary',
      message.status === MsgStatus.FAILED ? 'opacity-70' : '',
      isFirstInStreak ? 'animate-slideIn' : '',
    ].join(' ')}
  >
    <p className="leading-relaxed text-[14px] sm:text-[15px] whitespace-pre-wrap">
      {splitIntoSegments(message.content).map((seg, i) =>
        seg.isEmoji ? (
          <span
            key={i}
            style={{ fontSize: '1.6em', lineHeight: 1, verticalAlign: 'middle', display: 'inline-block' }}
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </p>
  </div>
)
