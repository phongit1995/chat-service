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

  return (
    <button
      onClick={onClick}
      className={[
        'w-full p-3 rounded-xl mb-1.5 text-left group',
        'transition-[background,transform,box-shadow] duration-fast ease-ease-smooth',
        isActive
          ? 'bg-gradient-soft shadow-soft-md'
          : 'hover:bg-surface-overlay active:bg-surface-elevated',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <Avatar
          src={conversation.avatar}
          name={displayName}
          size="lg"
          storyRing={hasUnread}
          storyRingSeen={!hasUnread}
          status={
            conversation.type === 'direct' && conversation.otherUser?.isOnline
              ? 'online'
              : undefined
          }
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
                  <span className="text-ink-tertiary">{conversation.lastMessageSenderName}: </span>
                ) : null}
                {conversation.lastMessageText}
              </p>
            ) : (
              <p className="text-[13px] text-ink-tertiary italic flex-1">No messages yet</p>
            )}

            {hasUnread ? (
              <span className="bg-gradient-signature text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-2 flex-shrink-0 shadow-glow-gradient animate-scaleIn">
                {conversation.unreadCount! > 99 ? '99+' : conversation.unreadCount}
              </span>
            ) : conversation.isLastMessageFromMe && conversation.seen ? (
              <span
                title="Seen"
                className="text-primary-500 text-[13px] flex-shrink-0"
              >
                ✓✓
              </span>
            ) : conversation.isLastMessageFromMe ? (
              <span
                title="Sent"
                className="text-ink-tertiary text-[13px] flex-shrink-0"
              >
                ✓
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  )
}
