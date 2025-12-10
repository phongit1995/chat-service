export const TypingIndicator = ({ count = 1 }: { count?: number }) => {
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
          {count === 1 ? 'Someone is typing' : `${count} people are typing`}...
        </span>
      </div>
    </div>
  )
}