import { Message } from '../../types'
import { Avatar } from '../ui'

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
  isLastOwnMessage?: boolean
  conversationSeen?: boolean
  isGroup?: boolean
  isFirstInStreak?: boolean
  isLastInStreak?: boolean
  showTime?: boolean
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export const MessageBubble = ({
  message,
  isOwnMessage,
  isLastOwnMessage = false,
  conversationSeen = false,
  isGroup = false,
  isFirstInStreak = true,
  isLastInStreak = true,
  showTime = true,
}: MessageBubbleProps) => {
  const renderStatus = () => {
    if (!isOwnMessage) return null

    if (message.status === 'sending') {
      return (
        <span title="Sending" className="inline-flex items-center text-ink-tertiary">
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </span>
      )
    }

    if (message.status === 'failed') {
      return (
        <span title="Failed to send" className="inline-flex items-center text-status-danger">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </span>
      )
    }

    if (!isLastOwnMessage) return null

    if (conversationSeen) {
      return (
        <span title="Seen" className="inline-flex items-center font-bold tracking-tighter text-primary-500 text-[12px]">
          ✓✓
        </span>
      )
    }

    return (
      <span title="Sent" className="inline-flex items-center text-ink-tertiary text-[12px]">
        ✓
      </span>
    )
  }

  const radius = (() => {
    const lg = '20px'
    const sm = '6px'
    if (isOwnMessage) {
      const tr = isFirstInStreak ? lg : sm
      const br = isLastInStreak ? lg : sm
      return `${lg} ${tr} ${br} ${lg}`
    }
    const tl = isFirstInStreak ? lg : sm
    const bl = isLastInStreak ? lg : sm
    return `${tl} ${lg} ${lg} ${bl}`
  })()

  const showAvatar = !isOwnMessage && isLastInStreak
  const showName = !isOwnMessage && isGroup && isFirstInStreak && !!message.senderName
  const marginTop = isFirstInStreak ? 'mt-3' : 'mt-1'

  return (
    <div className={`${marginTop} flex ${isOwnMessage ? 'justify-end' : 'justify-start'} gap-2 group`}>
      {!isOwnMessage && (
        <div className="w-8 flex-shrink-0 flex items-end">
          {showAvatar ? (
            <Avatar name={message.senderName || ''} src={message.senderAvatar} size="sm" />
          ) : null}
        </div>
      )}

      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {showName && (
          <p className="text-[11px] font-semibold mb-0.5 ml-2 text-ink-tertiary">
            {message.senderName}
          </p>
        )}

        <div
          style={{ borderRadius: radius }}
          className={[
            'px-3.5 py-2 break-words shadow-soft-sm',
            isOwnMessage
              ? 'bg-gradient-signature text-on-gradient'
              : 'bg-surface-overlay text-ink-primary',
            message.status === 'failed' ? 'opacity-70' : '',
            isFirstInStreak ? 'animate-slideIn' : '',
          ].join(' ')}
        >
          <p className="leading-relaxed text-[15px] whitespace-pre-wrap">{message.content}</p>
        </div>

        {(showTime || message.status === 'sending' || message.status === 'failed') && (
          <div
            className={`mt-0.5 px-1 flex items-center gap-1.5 text-[11px] ${
              isOwnMessage ? 'justify-end' : 'justify-start text-ink-tertiary'
            }`}
          >
            <span className="text-ink-tertiary">{formatTime(message.createdAt)}</span>
            {renderStatus()}
          </div>
        )}
      </div>
    </div>
  )
}
