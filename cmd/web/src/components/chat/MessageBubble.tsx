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
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
      <div
        className={`
          max-w-xs lg:max-w-md xl:max-w-lg 
          px-4 py-3 rounded-2xl 
          shadow-sm
          ${isOwnMessage
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-sm'
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
          }
        `}
      >
        {!isOwnMessage && message.senderName && (
          <p className="text-xs font-semibold mb-1 text-blue-600">
            {message.senderName}
          </p>
        )}
        <p className="break-words leading-relaxed">{message.content}</p>
        <p className={`text-xs mt-1.5 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  )
}