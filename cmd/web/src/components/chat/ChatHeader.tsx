import { Conversation } from '../../types'
import { Avatar } from '../ui'

interface ChatHeaderProps {
  conversation?: Conversation
  onBack?: () => void
}

export const ChatHeader = ({ conversation, onBack }: ChatHeaderProps) => {
  if (!conversation) {
    return (
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="h-10 flex items-center">
          <div className="w-48 h-6 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  const getDisplayName = () => {
    if (conversation.name) return conversation.name
    if (conversation.type === 'direct') return 'Direct Message'
    return 'Group Chat'
  }

  return (
    <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        <Avatar
          src={conversation.avatar}
          name={getDisplayName()}
          size="md"
          status="online"
        />
        
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {getDisplayName()}
          </h2>
          <p className="text-sm text-gray-500">
            {conversation.type === 'direct' ? 'Active now' : `${conversation.participantCount || 0} members`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition" title="Call">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition" title="More">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}