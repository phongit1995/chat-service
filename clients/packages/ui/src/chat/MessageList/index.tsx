import { useCallback, useMemo, useRef } from 'react'
import { useChatStore, ConversationType} from '@chat/shared'
import { MessageBubble } from '../MessageBubble'
import { TypingIndicator } from '../TypingIndicator'
import { MessageBubbleSkeleton, MessageListSkeleton } from '../Skeletons'
import { buildMessageRows } from './messageRows.utils'
import { useChatScroll } from './useChatScroll'
import type { MessageListProps } from './MessageList.types'

export type { MessageListProps } from './MessageList.types'

export const MessageList = ({ conversation, messages, typingUsers, user, onOpenProfile }: MessageListProps) => {
  const rows = useMemo(() => buildMessageRows(messages, user?.id), [messages, user?.id])
  const scrollParentRef = useRef<HTMLDivElement>(null)
  const bottomAnchorRef = useRef<HTMLDivElement>(null)

  const isLoading = useChatStore((s) => s.isLoading)
  const toggleReaction = useChatStore((s) => s.toggleReaction)
  const showInitialSkeleton = isLoading && rows.length === 0

  const handleReact = useCallback(
    (mid: string, type: string) => {
      toggleReaction(mid, type)
    },
    [toggleReaction],
  )

  const isGroup = conversation.type === ConversationType.GROUP
  const conversationSeen = !!conversation.isLastMessageFromMe && !!conversation.seen
  const myUserId = user?.id || ''
  const profileHandler = isGroup ? onOpenProfile : undefined

  const newestId = rows.length > 0 ? rows[rows.length - 1].message.id : ''

  const { onImageLoaded, isLoadingMoreMessages } = useChatScroll({
    scrollParentRef,
    conversationId: conversation.id,
    newestMessageId: newestId,
    rowsCount: rows.length,
  })

  if (showInitialSkeleton) return <MessageListSkeleton />

  return (
    <div
      ref={scrollParentRef}
      className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 scrollbar-thin bg-surface-base"
    >
      {isLoadingMoreMessages && (
        <div className="space-y-3 py-3" role="status" aria-label="Loading older messages">
          <MessageBubbleSkeleton width="w-44" />
          <MessageBubbleSkeleton isOwn width="w-32" />
          <MessageBubbleSkeleton width="w-52" />
        </div>
      )}
      {rows.map((row) => (
        <MessageBubble
          key={row.message.id}
          message={row.message}
          isOwnMessage={row.isOwnMessage}
          isLastOwnMessage={row.isLastOwnMessage}
          conversationSeen={conversationSeen}
          isGroup={isGroup}
          isFirstInStreak={row.isFirstInStreak}
          isLastInStreak={row.isLastInStreak}
          showTime={row.isLastInStreak}
          myUserId={myUserId}
          onReact={handleReact}
          onOpenProfile={profileHandler}
          onImageLoaded={onImageLoaded}
        />
      ))}
      {typingUsers.size > 0 && <TypingIndicator typingUsers={typingUsers} />}
      <div ref={bottomAnchorRef} />
    </div>
  )
}
