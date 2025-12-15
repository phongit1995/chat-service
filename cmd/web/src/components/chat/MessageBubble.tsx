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
        className={`
          max-w-xs lg:max-w-md xl:max-w-lg
          px-4 py-3 rounded-2xl
          transition-all duration-200
          ${isOwnMessage
            ? 'bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 text-white rounded-br-md shadow-md hover:shadow-lg animate-slideInRight'
            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md shadow-sm hover:shadow-md animate-slideIn'
          }
        `}
      >
        {!isOwnMessage && message.senderName && (
          <p className="text-xs font-semibold mb-1.5 text-blue-600">
            {message.senderName}
          </p>
        )}
        <p className="break-words leading-relaxed text-[15px]">{message.content}</p>
        <p className={`text-[11px] mt-2 flex items-center gap-1 ${isOwnMessage ? 'text-blue-100 justify-end' : 'text-gray-500'}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  )
}