import { useEffect, useRef } from 'react'

export const useAutoScrollToBottom = (trigger: unknown, behavior: ScrollBehavior = 'smooth') => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [behavior, trigger])

  return bottomRef
}
