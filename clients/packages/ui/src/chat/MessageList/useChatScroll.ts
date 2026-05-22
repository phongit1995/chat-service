import { RefObject, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useChatStore } from '@chat/shared'

const LOAD_MORE_THRESHOLD_PX = 200
const STICK_TO_BOTTOM_PX = 120

interface UseChatScrollArgs {
  scrollParentRef: RefObject<HTMLDivElement | null>
  conversationId: string
  newestMessageId: string
  rowsCount: number
}

export const useChatScroll = ({
  scrollParentRef,
  conversationId,
  newestMessageId,
  rowsCount,
}: UseChatScrollArgs) => {
  const lastNewestIdRef = useRef<string>('')
  const lastConversationIdRef = useRef<string>('')
  const stickToBottomRef = useRef<boolean>(true)
  const prevScrollHeightRef = useRef<number>(0)

  const hasMoreMessages = useChatStore((s) => s.hasMoreMessages)
  const isLoadingMoreMessages = useChatStore((s) => s.isLoadingMoreMessages)
  const loadMoreMessages = useChatStore((s) => s.loadMoreMessages)

  useLayoutEffect(() => {
    const el = scrollParentRef.current
    if (!el) return

    if (lastConversationIdRef.current !== conversationId) {
      lastConversationIdRef.current = conversationId
      lastNewestIdRef.current = newestMessageId
      stickToBottomRef.current = true
      el.scrollTop = el.scrollHeight
      prevScrollHeightRef.current = el.scrollHeight
      return
    }

    if (
      isLoadingMoreMessages ||
      (prevScrollHeightRef.current > 0 &&
        el.scrollHeight > prevScrollHeightRef.current &&
        newestMessageId === lastNewestIdRef.current)
    ) {
      const delta = el.scrollHeight - prevScrollHeightRef.current
      if (delta > 0) el.scrollTop = el.scrollTop + delta
      prevScrollHeightRef.current = el.scrollHeight
      return
    }

    if (newestMessageId && newestMessageId !== lastNewestIdRef.current) {
      lastNewestIdRef.current = newestMessageId
      if (stickToBottomRef.current) {
        el.scrollTop = el.scrollHeight
      }
    }

    prevScrollHeightRef.current = el.scrollHeight
  }, [conversationId, newestMessageId, rowsCount, isLoadingMoreMessages, scrollParentRef])

  useEffect(() => {
    const el = scrollParentRef.current
    if (!el) return
    const onScroll = () => {
      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      stickToBottomRef.current = distanceToBottom < STICK_TO_BOTTOM_PX
      if (el.scrollTop < LOAD_MORE_THRESHOLD_PX && hasMoreMessages && !isLoadingMoreMessages) {
        prevScrollHeightRef.current = el.scrollHeight
        loadMoreMessages(conversationId)
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [conversationId, hasMoreMessages, isLoadingMoreMessages, loadMoreMessages, scrollParentRef])

  const onImageLoaded = useCallback(() => {
    const el = scrollParentRef.current
    if (!el) return
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [scrollParentRef])

  return { onImageLoaded, isLoadingMoreMessages }
}
