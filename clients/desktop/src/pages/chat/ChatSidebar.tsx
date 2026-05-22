import { useEffect, useState } from 'react'
import { Avatar, ConversationItem, FriendsList, SidebarTabs } from '@chat/ui'
import type { SidebarTab } from '@chat/ui'
import { useFriendsStore, useFriendsManagementStore } from '@chat/shared'
import type { User, Conversation } from '@chat/shared'

interface ChatSidebarProps {
  user: User | null
  conversations: Conversation[]
  currentConversation: Conversation | null
  onProfileClick: () => void
  onNewChatClick: () => void
  onLogout: () => void
  onConversationClick: (conversationId: string) => void
  onHideConversation?: (conversationId: string) => void
  onStartChatWithUser: (userId: string) => void
  onOpenUserProfile: (userId: string) => void
  onOpenFriendsManagement: () => void
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
  onStartChatWithUser,
  onOpenUserProfile,
  onOpenFriendsManagement,
}: ChatSidebarProps) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('chats')

  const friends = useFriendsStore((s) => s.friends)
  const friendsLoading = useFriendsStore((s) => s.loading)
  const friendsLoadingMore = useFriendsStore((s) => s.loadingMore)
  const friendsError = useFriendsStore((s) => s.error)
  const friendsTotal = useFriendsStore((s) => s.total)
  const friendsLoaded = useFriendsStore((s) => s.loaded)
  const loadFriends = useFriendsStore((s) => s.load)
  const loadMoreFriends = useFriendsStore((s) => s.loadMore)

  const pendingTotal = useFriendsManagementStore((s) => s.requests.total)
  const refreshCounts = useFriendsManagementStore((s) => s.refreshCounts)

  useEffect(() => {
    if (activeTab === 'friends' && !friendsLoaded) loadFriends()
  }, [activeTab, friendsLoaded, loadFriends])

  useEffect(() => {
    if (activeTab === 'friends') refreshCounts()
  }, [activeTab, refreshCounts])

  return (
    <>
      <div
        className="px-3 sm:px-4 pt-3 sm:pt-4 pb-3 sm:pb-4 border-b border-line-subtle bg-gradient-signature relative overflow-hidden"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
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

      <SidebarTabs activeTab={activeTab} onChange={setActiveTab} friendsCount={friendsTotal} />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-3">
          {activeTab === 'chats' ? (
            conversations.length === 0 ? (
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
            )
          ) : (
            <>
              <button
                onClick={onOpenFriendsManagement}
                className="w-full flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl hover:bg-surface-overlay transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-signature flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-3.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink-primary text-sm">Manage friends</p>
                  <p className="text-[12px] text-ink-tertiary truncate">
                    {pendingTotal > 0 ? `${pendingTotal} pending request${pendingTotal === 1 ? '' : 's'}` : 'Requests, sent, blocked'}
                  </p>
                </div>
                {pendingTotal > 0 && (
                  <span className="bg-gradient-signature text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-2">
                    {pendingTotal > 99 ? '99+' : pendingTotal}
                  </span>
                )}
                <svg className="w-4 h-4 text-ink-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <FriendsList
                friends={friends}
                loading={friendsLoading}
                loadingMore={friendsLoadingMore}
                error={friendsError}
                total={friendsTotal}
                onLoadMore={loadMoreFriends}
                onStartChat={onStartChatWithUser}
                onOpenProfile={onOpenUserProfile}
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
