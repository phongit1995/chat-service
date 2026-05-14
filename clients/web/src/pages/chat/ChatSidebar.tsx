import { Avatar } from '../../components/ui'
import { ConversationItem } from '../../components/chat'
import type { User, Conversation } from '../../types'

interface ChatSidebarProps {
  user: User | null
  conversations: Conversation[]
  currentConversation: Conversation | null
  onProfileClick: () => void
  onNewChatClick: () => void
  onLogout: () => void
  onConversationClick: (conversationId: string) => void
  onHideConversation?: (conversationId: string) => void
}

export const ChatSidebar = ({
  user,
  conversations,
  currentConversation,
  onProfileClick,
  onNewChatClick,
  onLogout,
  onConversationClick,
  onHideConversation,
}: ChatSidebarProps) => {
  return (
    <>
      <div className="p-4 border-b border-line-subtle bg-gradient-signature relative overflow-hidden">
        <div className="absolute inset-0 bg-white/10 pointer-events-none" />
        <div className="flex items-center justify-between relative z-10">
          <button
            onClick={onProfileClick}
            className="flex items-center gap-3 hover:bg-white/15 rounded-full p-1.5 pr-4 transition-transform duration-fast ease-ease-bounce hover:scale-[1.02] active:scale-95"
          >
            <Avatar
              name={user?.fullName || user?.username || ''}
              src={user?.avatar}
              size="md"
              storyRing
            />
            <div className="text-left">
              <h2 className="font-semibold text-white text-on-gradient">
                {user?.fullName || user?.username}
              </h2>
              <p className="text-[11px] text-white/85">Online</p>
            </div>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewChatClick}
              className="p-2.5 hover:bg-white/20 rounded-full text-white transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95"
              title="Search (⌘K)"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </button>
            <button
              onClick={onLogout}
              className="p-2.5 hover:bg-white/20 rounded-full text-white transition-transform duration-fast ease-ease-bounce hover:scale-110 active:scale-95"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={onNewChatClick}
        className="mx-3 mt-3 flex items-center gap-3 px-4 py-2.5 bg-surface-overlay hover:bg-surface-elevated text-ink-secondary rounded-xl text-sm transition-colors text-left"
      >
        <svg className="w-4 h-4 text-ink-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <span className="flex-1">Search people, conversations...</span>
        <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-ink-tertiary bg-surface border border-line rounded">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-3">
          <h3 className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider px-3 py-2 mb-1">
            Messages
          </h3>
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-ink-tertiary">
              <svg className="w-16 h-16 mx-auto mb-4 text-ink-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="font-medium text-ink-primary">No conversations yet</p>
              <p className="text-[13px] mt-1">Start a new chat!</p>
            </div>
          ) : (
            [...conversations]
              .sort((a, b) => {
                const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
                const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
                return timeB - timeA
              })
              .map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={currentConversation?.id === conv.id}
                  onClick={() => onConversationClick(conv.id)}
                  onHide={onHideConversation ? () => onHideConversation(conv.id) : undefined}
                />
              ))
          )}
        </div>
      </div>
    </>
  )
}
