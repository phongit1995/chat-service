import { Conversation } from '../../types'
import { Avatar } from '../ui'

interface ChatHeaderProps {
  conversation?: Conversation
  onBack?: () => void
}

export const ChatHeader = ({ conversation, onBack }: ChatHeaderProps) => {
  if (!conversation) {
    return (
      <div className="bg-surface/90 backdrop-blur-sm border-b border-line-subtle p-4">
        <div className="h-10 flex items-center">
          <div className="w-48 h-6 bg-surface-overlay rounded-md animate-pulse-soft" />
        </div>
      </div>
    )
  }

  const displayName =
    conversation.name || (conversation.type === 'group' ? 'Group Chat' : 'Unknown')

  return (
    <div className="bg-surface/90 backdrop-blur-sm border-b border-line-subtle p-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="lg:hidden p-2 hover:bg-surface-overlay rounded-full transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95"
            aria-label="Back"
          >
            <svg className="w-5 h-5 text-ink-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <Avatar
          src={conversation.avatar}
          name={displayName}
          size="md"
          status="online"
        />

        <div className="flex-1 min-w-0">
          <h2 className="text-[18px] font-semibold font-display text-ink-primary truncate">
            {displayName}
          </h2>
          <p className="text-[12px] text-status-success font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 bg-status-success rounded-full animate-pulse-soft" />
            {conversation.type === 'direct'
              ? 'Active now'
              : `${conversation.participantCount || 0} members`}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-2.5 hover:bg-surface-overlay rounded-full text-ink-secondary hover:text-primary-500 transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95"
            title="Call"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
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
