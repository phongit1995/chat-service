import { useFriendsManagementStore, FriendsTab } from '@chat/shared'
import { FriendsTabPanel } from './tabs/FriendsTabPanel'
import { RequestsTabPanel } from './tabs/RequestsTabPanel'
import { SentTabPanel } from './tabs/SentTabPanel'
import { BlockedTabPanel } from './tabs/BlockedTabPanel'
import type { FriendsManagementPageProps } from './FriendsManagementPage.types'

export type { FriendsManagementPageProps } from './FriendsManagementPage.types'

interface TabDef {
  key: FriendsTab
  label: string
  badge?: number
}

export const FriendsManagementPage = ({ onBack, onStartChat, onOpenProfile }: FriendsManagementPageProps) => {
  const activeTab = useFriendsManagementStore((s) => s.activeTab)
  const setActiveTab = useFriendsManagementStore((s) => s.setActiveTab)
  const requestsTotal = useFriendsManagementStore((s) => s.requests.total)
  const friendsTotal = useFriendsManagementStore((s) => s.friends.total)
  const sentTotal = useFriendsManagementStore((s) => s.sent.total)
  const blockedTotal = useFriendsManagementStore((s) => s.blocked.total)

  const tabs: TabDef[] = [
    { key: FriendsTab.FRIENDS, label: 'Friends', badge: friendsTotal },
    { key: FriendsTab.REQUESTS, label: 'Requests', badge: requestsTotal },
    { key: FriendsTab.SENT, label: 'Sent', badge: sentTotal },
    { key: FriendsTab.BLOCKED, label: 'Blocked', badge: blockedTotal },
  ]

  return (
    <div className="flex flex-col h-full bg-surface-base">
      <div className="flex items-center gap-3 px-3 sm:px-5 py-3 sm:py-4 border-b border-line-subtle bg-surface">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-surface-overlay transition-colors text-ink-secondary"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-ink-primary">Friends</span>
      </div>

      <div className="flex items-center gap-1 px-3 sm:px-5 pt-3 border-b border-line-subtle bg-surface">
        {tabs.map((t) => {
          const active = t.key === activeTab
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={[
                'relative px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5',
                active ? 'text-primary-500' : 'text-ink-secondary hover:text-ink-primary',
              ].join(' ')}
            >
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && (
                <span
                  className={[
                    'text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5',
                    active ? 'bg-primary-500/15 text-primary-500' : 'bg-surface-overlay text-ink-tertiary',
                  ].join(' ')}
                >
                  {t.badge > 99 ? '99+' : t.badge}
                </span>
              )}
              {active && <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-primary-500 rounded-full" />}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3 max-w-3xl mx-auto w-full">
        {activeTab === FriendsTab.FRIENDS && (
          <FriendsTabPanel onStartChat={onStartChat} onOpenProfile={onOpenProfile} />
        )}
        {activeTab === FriendsTab.REQUESTS && <RequestsTabPanel onOpenProfile={onOpenProfile} />}
        {activeTab === FriendsTab.SENT && <SentTabPanel onOpenProfile={onOpenProfile} />}
        {activeTab === FriendsTab.BLOCKED && <BlockedTabPanel onOpenProfile={onOpenProfile} />}
      </div>
    </div>
  )
}
