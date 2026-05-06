import { Message } from '../../types'

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
}

export const MessageBubble = ({ message, isOwnMessage }: MessageBubbleProps) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={[
          'max-w-xs lg:max-w-md xl:max-w-lg break-words',
          isOwnMessage
            ? 'message-sent text-on-gradient animate-slideInRight'
            : 'message-received animate-slideIn',
        ].join(' ')}
      >
        {!isOwnMessage && message.senderName && (
          <p className="text-[12px] font-semibold mb-1 text-gradient">
            {message.senderName}
          </p>
        )}
        <p className="leading-relaxed text-[15px]">{message.content}</p>
        <p
          className={`text-[11px] mt-1.5 flex items-center gap-1 ${
            isOwnMessage ? 'opacity-90 justify-end' : 'text-ink-tertiary'
          }`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  )
}
