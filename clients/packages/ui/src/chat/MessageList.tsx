import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { useChatStore } from '@chat/shared'
import type { Conversation, Message, User } from '@chat/shared'
import type { TypingUserInfo } from '@chat/shared'

interface MessageListProps {
  conversation: Conversation
  messages: Message[]
  typingUsers: Map<string, TypingUserInfo>
  user: User | null
  onOpenProfile?: (userId: string) => void
}

interface MessageRow {
  message: Message
  isOwnMessage: boolean
  isLastOwnMessage: boolean
  isFirstInStreak: boolean
  isLastInStreak: boolean
}

const STREAK_GAP_MS = 5 * 60 * 1000
const LOAD_MORE_THRESHOLD_PX = 200
const ESTIMATED_ROW_HEIGHT = 72
const OVERSCAN = 8

export const MessageList = ({ conversation, messages, typingUsers, user, onOpenProfile }: MessageListProps) => {
  const rows = useMemo<MessageRow[]>(() => {
    const sorted = messages
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    let lastOwnIdx = -1
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].senderId === user?.id) {
        lastOwnIdx = i
        break
      }
    }

    return sorted.map((message, idx) => {
      const prev = sorted[idx - 1]
      const next = sorted[idx + 1]
      const currentTime = new Date(message.createdAt).getTime()
      const sameSenderAsPrev =
        !!prev &&
        prev.senderId === message.senderId &&
        currentTime - new Date(prev.createdAt).getTime() < STREAK_GAP_MS
      const sameSenderAsNext =
        !!next &&
        next.senderId === message.senderId &&
        new Date(next.createdAt).getTime() - currentTime < STREAK_GAP_MS
      return {
        message,
        isOwnMessage: message.senderId === user?.id,
        isLastOwnMessage: idx === lastOwnIdx,
        isFirstInStreak: !sameSenderAsPrev,
        isLastInStreak: !sameSenderAsNext,
      }
    })
  }, [messages, user?.id])

  const scrollParentRef = useRef<HTMLDivElement>(null)
  const lastNewestIdRef = useRef<string>('')
  const lastConversationIdRef = useRef<string>('')

  const hasMoreMessages = useChatStore((s) => s.hasMoreMessages)
  const isLoadingMoreMessages = useChatStore((s) => s.isLoadingMoreMessages)
  const loadMoreMessages = useChatStore((s) => s.loadMoreMessages)
  const toggleReaction = useChatStore((s) => s.toggleReaction)

  const handleReact = useCallback(
    (mid: string, type: string) => {
      toggleReaction(mid, type)
    },
    [toggleReaction],
  )

  const isGroup = conversation.type === 'group'
  const conversationSeen = !!conversation.isLastMessageFromMe && !!conversation.seen
  const myUserId = user?.id || ''
  const profileHandler = isGroup ? onOpenProfile : undefined

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: OVERSCAN,
    getItemKey: (index) => rows[index].message.id,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  const newestId = rows.length > 0 ? rows[rows.length - 1].message.id : ''

  useEffect(() => {
    if (lastConversationIdRef.current !== conversation.id) {
      lastConversationIdRef.current = conversation.id
      lastNewestIdRef.current = ''
      if (rows.length > 0) {
        virtualizer.scrollToIndex(rows.length - 1, { align: 'end' })
      }
      return
    }
    if (newestId && newestId !== lastNewestIdRef.current) {
      lastNewestIdRef.current = newestId
      virtualizer.scrollToIndex(rows.length - 1, { align: 'end', behavior: 'smooth' })
    }
  }, [conversation.id, newestId, rows.length, virtualizer])

  useEffect(() => {
    const el = scrollParentRef.current
    if (!el) return
    const onScroll = () => {
      if (el.scrollTop < LOAD_MORE_THRESHOLD_PX && hasMoreMessages && !isLoadingMoreMessages) {
        loadMoreMessages(conversation.id)
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [conversation.id, hasMoreMessages, isLoadingMoreMessages, loadMoreMessages])

  return (
    <div
      ref={scrollParentRef}
      className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 scrollbar-thin bg-surface-base"
    >
      {isLoadingMoreMessages && (
        <div className="flex justify-center py-2 text-xs text-text-secondary">Loading…</div>
      )}
      <div style={{ height: totalSize, width: '100%', position: 'relative' }}>
        {virtualItems.map((vi) => {
          const row = rows[vi.index]
          return (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              className="hover:z-30 focus-within:z-30"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <MessageBubble
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
              />
            </div>
          )
        })}
      </div>
      {typingUsers.size > 0 && <TypingIndicator typingUsers={typingUsers} />}
    </div>
  )
}
