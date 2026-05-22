export const ConversationItemSkeleton = () => (
  <div className="flex items-center gap-3 px-3 sm:px-4 py-3">
    <div className="w-12 h-12 rounded-full bg-surface-overlay animate-pulse-soft shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <div className="h-3.5 w-32 bg-surface-overlay rounded animate-pulse-soft" />
      <div className="h-3 w-48 bg-surface-overlay rounded animate-pulse-soft opacity-70" />
    </div>
    <div className="h-2.5 w-10 bg-surface-overlay rounded animate-pulse-soft opacity-60" />
  </div>
)

export const ConversationListSkeleton = ({ count = 8 }: { count?: number }) => (
  <div role="status" aria-label="Loading conversations" className="divide-y divide-line-subtle/40">
    {Array.from({ length: count }, (_, i) => (
      <ConversationItemSkeleton key={i} />
    ))}
  </div>
)

interface MessageBubbleSkeletonProps {
  isOwn?: boolean
  width?: string
}

export const MessageBubbleSkeleton = ({ isOwn = false, width = 'w-48' }: MessageBubbleSkeletonProps) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2 mt-3`}>
    {!isOwn && <div className="w-8 h-8 rounded-full bg-surface-overlay animate-pulse-soft shrink-0" />}
    <div className={`${width} max-w-[65%]`}>
      <div className={`h-9 ${width} rounded-2xl bg-surface-overlay animate-pulse-soft`} />
    </div>
  </div>
)

export const MessageListSkeleton = () => {
  const pattern: Array<{ isOwn: boolean; width: string }> = [
    { isOwn: false, width: 'w-40' },
    { isOwn: false, width: 'w-56' },
    { isOwn: true, width: 'w-32' },
    { isOwn: true, width: 'w-48' },
    { isOwn: false, width: 'w-52' },
    { isOwn: true, width: 'w-40' },
    { isOwn: false, width: 'w-36' },
    { isOwn: false, width: 'w-48' },
  ]
  return (
    <div
      role="status"
      aria-label="Loading messages"
      className="flex-1 overflow-hidden px-3 sm:px-4 py-3 sm:py-4 bg-surface-base"
    >
      {pattern.map((p, i) => (
        <MessageBubbleSkeleton key={i} isOwn={p.isOwn} width={p.width} />
      ))}
    </div>
  )
}
