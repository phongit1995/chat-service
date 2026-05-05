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

  const getTypingText = () => {
    const users = Array.from(typingUsers.values())
    
    if (count === 1) {
      return `${users[0].username} is typing`
    } else if (count === 2) {
      return `${users[0].username} and ${users[1].username} are typing`
    } else if (count === 3) {
      return `${users[0].username}, ${users[1].username} and ${users[2].username} are typing`
    } else {
      return `${users[0].username}, ${users[1].username} and ${count - 2} others are typing`
    }
  }

  return (
    <div className="flex justify-start animate-fadeIn">
      <div className="bg-gray-100 text-gray-600 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-3 shadow-sm border border-gray-200">
        <div className="flex gap-1">
          <span 
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
            style={{ animationDelay: '0ms' }}
          />
          <span 
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
            style={{ animationDelay: '150ms' }}
          />
          <span 
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
            style={{ animationDelay: '300ms' }}
          />
        </div>
        <span className="text-sm">
          {getTypingText()}...
        </span>
      </div>
    </div>
  )
}