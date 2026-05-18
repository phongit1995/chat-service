import { Conversation } from '@chat/shared'
import { Avatar } from '../common'
import { CallButton } from '../call'
import { formatLastActive } from '@chat/shared'

interface ChatHeaderProps {
  conversation?: Conversation
  onBack?: () => void
}

export const ChatHeader = ({ conversation, onBack }: ChatHeaderProps) => {
  if (!conversation) {
    return (
      <div className="bg-surface/90 backdrop-blur-sm border-b border-line-subtle px-3 sm:px-4 py-3 sm:py-4">
        <div className="h-10 flex items-center">
          <div className="w-48 h-6 bg-surface-overlay rounded-md animate-pulse-soft" />
        </div>
      </div>
    )
  }

  const displayName =
    conversation.name || (conversation.type === 'group' ? 'Group Chat' : 'Unknown')

  return (
    <div className="bg-surface/90 backdrop-blur-sm border-b border-line-subtle px-3 sm:px-4 py-3 sm:py-4">
      <div className="flex items-center gap-2 sm:gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-2 hover:bg-surface-overlay rounded-full transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95 shrink-0"
            aria-label="Back"
          >
            <svg className="w-5 h-5 text-ink-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {(() => {
          const isDirect = conversation.type === 'direct'
          const isOnline = isDirect && !!conversation.otherUser?.isOnline
          const subtitle = isDirect
            ? isOnline
              ? 'Active now'
              : formatLastActive(conversation.otherUser?.lastActiveAt)
            : `${conversation.participantCount || 0} members`
          const subtitleColor = isOnline
            ? 'text-status-success'
            : isDirect && subtitle.startsWith('Active')
              ? 'text-ink-secondary'
              : 'text-ink-tertiary'
          return (
            <>
              <Avatar
                src={conversation.avatar}
                name={displayName}
                size="md"
                status={isDirect ? (isOnline ? 'online' : 'offline') : undefined}
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-[18px] font-semibold font-display text-ink-primary truncate">
                  {displayName}
                </h2>
                <p className={`text-[11px] sm:text-[12px] font-medium truncate ${subtitleColor}`}>
                  {subtitle}
                </p>
              </div>
            </>
          )
        })()}

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {conversation.type === 'direct' && conversation.otherUser && (
            <CallButton
              conversationId={conversation.id}
              peer={{
                id: conversation.otherUser.id,
                username: conversation.otherUser.username,
                fullName: conversation.otherUser.fullName,
                avatar: conversation.otherUser.avatar,
              }}
            />
          )}
          <button
            className="p-2.5 hover:bg-surface-overlay rounded-full text-ink-secondary hover:text-primary-500 transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95"
            title="More"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
