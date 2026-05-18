interface TypingUserInfo {
  userId: string
  username: string
}

interface TypingIndicatorProps {
  typingUsers: Map<string, TypingUserInfo>
}

export const TypingIndicator = ({ typingUsers }: TypingIndicatorProps) => {
  const count = typingUsers.size
  if (count === 0) return null

  const users = Array.from(typingUsers.values())
  const text =
    count === 1
      ? `${users[0].username} is typing`
      : count === 2
      ? `${users[0].username} and ${users[1].username} are typing`
      : count === 3
      ? `${users[0].username}, ${users[1].username} and ${users[2].username} are typing`
      : `${users[0].username}, ${users[1].username} and ${count - 2} others are typing`

  return (
    <div className="flex justify-start animate-fadeIn">
      <div className="bg-surface-overlay text-ink-secondary px-4 py-2.5 rounded-xl rounded-bl-sm flex items-center gap-3 shadow-soft-sm">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-[13px]">{text}…</span>
      </div>
    </div>
  )
}
