export type SidebarTab = 'chats' | 'friends'

interface SidebarTabsProps {
  activeTab: SidebarTab
  onChange: (tab: SidebarTab) => void
  friendsCount?: number
}

export const SidebarTabs = ({ activeTab, onChange, friendsCount }: SidebarTabsProps) => {
  const tabs: { key: SidebarTab; label: string; badge?: number }[] = [
    { key: 'chats', label: 'Chats' },
    { key: 'friends', label: 'Friends', badge: friendsCount },
  ]

  return (
    <div className="mx-3 mt-3 flex items-center gap-1 p-1 bg-surface-overlay rounded-xl">
      {tabs.map((t) => {
        const active = t.key === activeTab
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              active
                ? 'bg-surface text-ink-primary shadow-soft-sm'
                : 'text-ink-secondary hover:text-ink-primary',
            ].join(' ')}
          >
            <span>{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span
                className={[
                  'text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5',
                  active ? 'bg-primary-500/15 text-primary-500' : 'bg-surface text-ink-tertiary',
                ].join(' ')}
              >
                {t.badge > 99 ? '99+' : t.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
