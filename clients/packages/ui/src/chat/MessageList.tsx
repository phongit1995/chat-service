import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { MessageBubbleSkeleton, MessageListSkeleton } from './Skeletons'
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
const STICK_TO_BOTTOM_PX = 120

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
  const bottomAnchorRef = useRef<HTMLDivElement>(null)
  const lastNewestIdRef = useRef<string>('')
  const lastConversationIdRef = useRef<string>('')
  const stickToBottomRef = useRef<boolean>(true)
  const prevScrollHeightRef = useRef<number>(0)

  const hasMoreMessages = useChatStore((s) => s.hasMoreMessages)
  const isLoadingMoreMessages = useChatStore((s) => s.isLoadingMoreMessages)
  const loadMoreMessages = useChatStore((s) => s.loadMoreMessages)
  const isLoading = useChatStore((s) => s.isLoading)
  const toggleReaction = useChatStore((s) => s.toggleReaction)
  const showInitialSkeleton = isLoading && rows.length === 0

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

  const newestId = rows.length > 0 ? rows[rows.length - 1].message.id : ''

  useLayoutEffect(() => {
    const el = scrollParentRef.current
    if (!el) return

    if (lastConversationIdRef.current !== conversation.id) {
      lastConversationIdRef.current = conversation.id
      lastNewestIdRef.current = newestId
      stickToBottomRef.current = true
      el.scrollTop = el.scrollHeight
      prevScrollHeightRef.current = el.scrollHeight
      return
    }

    if (isLoadingMoreMessages || (prevScrollHeightRef.current > 0 && el.scrollHeight > prevScrollHeightRef.current && newestId === lastNewestIdRef.current)) {
      const delta = el.scrollHeight - prevScrollHeightRef.current
      if (delta > 0) el.scrollTop = el.scrollTop + delta
      prevScrollHeightRef.current = el.scrollHeight
      return
    }

    if (newestId && newestId !== lastNewestIdRef.current) {
      lastNewestIdRef.current = newestId
      if (stickToBottomRef.current) {
        el.scrollTop = el.scrollHeight
      }
    }

    prevScrollHeightRef.current = el.scrollHeight
  }, [conversation.id, newestId, rows.length, isLoadingMoreMessages])

  useEffect(() => {
    const el = scrollParentRef.current
    if (!el) return
    const onScroll = () => {
      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      stickToBottomRef.current = distanceToBottom < STICK_TO_BOTTOM_PX
      if (el.scrollTop < LOAD_MORE_THRESHOLD_PX && hasMoreMessages && !isLoadingMoreMessages) {
        prevScrollHeightRef.current = el.scrollHeight
        loadMoreMessages(conversation.id)
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [conversation.id, hasMoreMessages, isLoadingMoreMessages, loadMoreMessages])

  const onImageLoaded = useCallback(() => {
    const el = scrollParentRef.current
    if (!el) return
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [])

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
