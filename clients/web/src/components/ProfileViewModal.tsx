import { Avatar, Button, Modal } from './ui'

interface ProfileViewUser {
  id: string
  username?: string
  fullName?: string
  avatar?: string
  bio?: string
  email?: string
}

interface ProfileViewModalProps {
  isOpen: boolean
  onClose: () => void
  user: ProfileViewUser | null
  onMessage?: (userId: string) => void
}

export const ProfileViewModal = ({ isOpen, onClose, user, onMessage }: ProfileViewModalProps) => {
  if (!user) return null

  const displayName = user.fullName || user.username || 'Unknown'

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" ariaLabel={`Profile of ${displayName}`}>
      <div className="relative h-28 bg-gradient-signature flex-shrink-0">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6 pb-6 -mt-12 flex flex-col items-center">
        <div className="ring-4 ring-surface rounded-full">
          <Avatar name={displayName} src={user.avatar} size="xl" />
        </div>

        <h2 className="mt-3 text-xl font-bold text-ink-primary text-center">{displayName}</h2>
        {user.username && (
          <p className="text-sm text-ink-tertiary">@{user.username}</p>
        )}

        {user.bio && (
          <p className="mt-4 text-sm text-ink-secondary text-center leading-relaxed max-w-sm">
            {user.bio}
          </p>
        )}

        {user.email && (
          <div className="mt-4 w-full bg-surface-elevated rounded-lg px-4 py-3 flex items-center gap-3">
            <svg className="w-4 h-4 text-ink-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-ink-primary truncate">{user.email}</span>
          </div>
        )}

        {onMessage && (
          <Button
            type="button"
            onClick={() => {
              onMessage(user.id)
              onClose()
            }}
            className="mt-5 w-full"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Send Message
          </Button>
        )}
      </div>
    </Modal>
  )
}
