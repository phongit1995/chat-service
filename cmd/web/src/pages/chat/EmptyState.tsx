export const EmptyState = () => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center animate-fadeIn">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full blur-2xl opacity-20 animate-pulse-slow"></div>
          <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Chat</h3>
        <p className="text-gray-600 mb-4">Select a conversation to start chatting</p>
        <p className="text-sm text-gray-500">or create a new one by clicking the <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded font-bold text-xs">+</span> button</p>
      </div>
    </div>
  )
}