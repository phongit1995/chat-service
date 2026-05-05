import { Conversation } from '../../types'
import { Avatar } from '../ui'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

export const ConversationItem = ({ conversation, isActive, onClick }: ConversationItemProps) => {
  const hasUnread = (conversation.unreadCount || 0) > 0

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getDisplayName = () => conversation.name || (conversation.type === 'group' ? 'Group Chat' : 'Unknown')

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3 rounded-xl mb-1.5 text-left transition-all duration-200 group
        ${isActive
          ? 'bg-gradient-to-r from-blue-50 via-blue-50 to-indigo-50 border-l-4 border-blue-600 shadow-md scale-[1.02]'
          : 'hover:bg-gray-50 hover:shadow-sm active:bg-gray-100 hover:scale-[1.01]'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar
            src={conversation.avatar}
            name={getDisplayName()}
            size="lg"
            status="online"
          />
          {hasUnread && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`font-semibold truncate transition-colors ${
              isActive ? 'text-blue-900' : 'text-gray-900 group-hover:text-gray-950'
            }`}>
              {getDisplayName()}
            </h4>
            {conversation.lastMessageAt && (
              <span className={`text-xs ml-2 flex-shrink-0 font-medium ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {formatTime(conversation.lastMessageAt)}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-2">
            {conversation.lastMessageText ? (
              <p className={`text-sm truncate flex-1 ${
                hasUnread ? 'font-semibold text-gray-900' : 'text-gray-600'
              }`}>
                {conversation.lastMessageText}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic flex-1">
                No messages yet
              </p>
            )}
            
            {hasUnread && (
              <span className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-2 flex-shrink-0 shadow-md animate-scaleIn">
                {conversation.unreadCount! > 99 ? '99+' : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}