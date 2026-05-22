import { useState } from 'react'
import { useFriendsManagementStore, FriendsTab } from '@chat/shared'
import { Modal, ModalHeader } from '../../common'
import { RequestsTabPanel } from '../FriendsManagementPage/tabs/RequestsTabPanel'
import { SentTabPanel } from '../FriendsManagementPage/tabs/SentTabPanel'
import { BlockedTabPanel } from '../FriendsManagementPage/tabs/BlockedTabPanel'

interface FriendsManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenProfile: (userId: string) => void
}

type ModalTab = Exclude<FriendsTab, typeof FriendsTab.FRIENDS>

const TABS: { key: ModalTab; label: string }[] = [
  { key: FriendsTab.REQUESTS, label: 'Requests' },
  { key: FriendsTab.SENT, label: 'Sent' },
  { key: FriendsTab.BLOCKED, label: 'Blocked' },
]

export const FriendsManagementModal = ({ isOpen, onClose, onOpenProfile }: FriendsManagementModalProps) => {
  const [active, setActive] = useState<ModalTab>(FriendsTab.REQUESTS)
  const requestsTotal = useFriendsManagementStore((s) => s.requests.total)
  const sentTotal = useFriendsManagementStore((s) => s.sent.total)
  const blockedTotal = useFriendsManagementStore((s) => s.blocked.total)

  const badgeFor = (k: ModalTab) =>
    k === FriendsTab.REQUESTS ? requestsTotal
    : k === FriendsTab.SENT ? sentTotal : blockedTotal

  const handleOpenProfile = (uid: string) => {
    onClose()
    onOpenProfile(uid)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" ariaLabel="Manage friends">
      <ModalHeader title="Manage friends" onClose={onClose} />

      <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-line-subtle">
        {TABS.map((t) => {
          const isActive = t.key === active
          const badge = badgeFor(t.key)
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={[
                'relative px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5',
                isActive ? 'text-primary-500' : 'text-ink-secondary hover:text-ink-primary',
              ].join(' ')}
            >
              <span>{t.label}</span>
              {badge > 0 && (
                <span
                  className={[
                    'text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5',
                    isActive ? 'bg-primary-500/15 text-primary-500' : 'bg-surface-overlay text-ink-tertiary',
                  ].join(' ')}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              {isActive && <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-primary-500 rounded-full" />}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 sm:px-4 py-3">
        {active === FriendsTab.REQUESTS && <RequestsTabPanel onOpenProfile={handleOpenProfile} />}
        {active === FriendsTab.SENT && <SentTabPanel onOpenProfile={handleOpenProfile} />}
        {active === FriendsTab.BLOCKED && <BlockedTabPanel onOpenProfile={handleOpenProfile} />}
      </div>
    </Modal>
  )
}
