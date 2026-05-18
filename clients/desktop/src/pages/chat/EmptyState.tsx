export const EmptyState = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-surface-base">
      <div className="text-center animate-fadeIn">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-gradient-warm rounded-full blur-3xl opacity-40 animate-pulse-soft" />
          <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-signature flex items-center justify-center text-white shadow-glow-gradient">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </div>
        <h3 className="text-2xl font-bold font-display text-ink-primary mb-2">
          Welcome to <span className="text-gradient">Chat</span>
        </h3>
        <p className="text-ink-secondary mb-3">Select a conversation to start chatting</p>
        <p className="text-[13px] text-ink-tertiary">
          or start a new one with the{' '}
          <span className="inline-flex items-center justify-center w-5 h-5 bg-gradient-signature text-white rounded-full font-bold text-[11px]">
            +
          </span>{' '}
          button
        </p>
      </div>
    </div>
  )
}
