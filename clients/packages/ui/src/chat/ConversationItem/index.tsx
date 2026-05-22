import { ConversationType } from '@chat/shared'
import { Avatar } from '../../common'
import { RichText } from './RichText'
import { formatConversationTime } from './time.utils'
import { useSwipeToHide } from './useSwipeToHide'
import type { ConversationItemProps } from './ConversationItem.types'

export type { ConversationItemProps } from './ConversationItem.types'

export const ConversationItem = ({
  conversation,
  isActive,
  onClick,
  onHide,
}: ConversationItemProps) => {
  const hasUnread = (conversation.unreadCount || 0) > 0
  const isOnline = conversation.type === ConversationType.DIRECT && !!conversation.otherUser?.isOnline

  const { offset, dragging, moved, willHide, handlers } = useSwipeToHide(onHide)

  const handleClick = () => {
    if (moved) return
    onClick()
  }

  const displayName =
    conversation.name || (conversation.type === ConversationType.GROUP ? 'Group Chat' : 'Unknown')

  return (
    <div className="relative overflow-hidden rounded-xl mb-1.5">
      {onHide && (
        <div
          className={[
            'absolute inset-y-0 right-0 flex items-center justify-end pr-4 select-none transition-colors',
            willHide ? 'bg-red-500' : 'bg-red-400/80',
          ].join(' ')}
          style={{ width: Math.min(-offset, 180) }}
        >
          <span className="text-white text-xs font-semibold uppercase tracking-wide">
            {willHide ? 'Release to hide' : 'Hide'}
          </span>
        </div>
      )}
      <div
        {...handlers}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 180ms ease',
          touchAction: 'pan-y',
        }}
      >
        <button
          onClick={handleClick}
          className={[
            'w-full p-3 rounded-xl text-left group',
            'transition-[background,box-shadow] duration-fast ease-ease-smooth',
            isActive
              ? 'bg-gradient-soft shadow-soft-md'
              : 'hover:bg-surface-overlay active:bg-surface-elevated bg-surface',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            <Avatar
              src={conversation.avatar}
              name={displayName}
              size="lg"
              storyRing={hasUnread}
              storyRingSeen={!hasUnread}
              status={isOnline ? 'online' : undefined}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h4 className="truncate font-semibold text-ink-primary">{displayName}</h4>
                {conversation.lastMessageAt && (
                  <span
                    className={`text-[11px] ml-2 flex-shrink-0 ${
                      hasUnread ? 'text-primary-500 font-semibold' : 'text-ink-tertiary'
                    }`}
                  >
                    {formatConversationTime(conversation.lastMessageAt)}
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
                    ) : conversation.type === ConversationType.GROUP && conversation.lastMessageSenderName ? (
                      <span className="text-ink-tertiary">
                        {conversation.lastMessageSenderName}:{' '}
                      </span>
                    ) : null}
                    <RichText text={conversation.lastMessageText} />
                  </p>
                ) : (
                  <p className="text-[13px] text-ink-tertiary italic flex-1">No messages yet</p>
                )}

                {hasUnread ? (
                  <span className="bg-gradient-signature text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-2 flex-shrink-0 shadow-glow-gradient animate-scaleIn">
                    {conversation.unreadCount! > 99 ? '99+' : conversation.unreadCount}
                  </span>
                ) : conversation.isLastMessageFromMe && conversation.seen ? (
                  <span title="Seen" className="text-primary-500 text-[13px] flex-shrink-0">
                    ✓✓
                  </span>
                ) : conversation.isLastMessageFromMe ? (
                  <span title="Sent" className="text-ink-tertiary text-[13px] flex-shrink-0">
                    ✓
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
