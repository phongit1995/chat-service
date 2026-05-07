import { Message } from '../../types'

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
  isLastOwnMessage?: boolean
  conversationSeen?: boolean
}

export const MessageBubble = ({
  message,
  isOwnMessage,
  isLastOwnMessage = false,
  conversationSeen = false,
}: MessageBubbleProps) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const renderStatus = () => {
    if (!isOwnMessage) return null

    if (message.status === 'sending') {
      return (
        <span title="Sending" className="inline-flex items-center">
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
        <span title="Failed to send" className="inline-flex items-center text-status-error">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </span>
      )
    }

    if (isLastOwnMessage && conversationSeen) {
      return (
        <span title="Seen" className="inline-flex items-center font-bold tracking-tighter">
          ✓✓
        </span>
      )
    }

    return (
      <span title="Sent" className="inline-flex items-center">
        ✓
      </span>
    )
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={[
          'max-w-xs lg:max-w-md xl:max-w-lg break-words',
          isOwnMessage
            ? 'message-sent text-on-gradient animate-slideInRight'
            : 'message-received animate-slideIn',
          message.status === 'failed' ? 'opacity-70' : '',
        ].join(' ')}
      >
        {!isOwnMessage && message.senderName && (
          <p className="text-[12px] font-semibold mb-1 text-gradient">
            {message.senderName}
          </p>
        )}
        <p className="leading-relaxed text-[15px]">{message.content}</p>
        <p
          className={`text-[11px] mt-1.5 flex items-center gap-1.5 ${
            isOwnMessage ? 'opacity-90 justify-end' : 'text-ink-tertiary'
          }`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatTime(message.createdAt)}</span>
          {renderStatus()}
        </p>
      </div>
    </div>
  )
}
