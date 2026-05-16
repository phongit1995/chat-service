import { useEffect, useState } from 'react'
import { Avatar, Button } from '../../components/ui'
import { userService } from '../../services/user.service'
import type { UserPublicProfile } from '../../types'

interface UserProfilePageProps {
  userId: string
  onBack: () => void
  onStartChat: (userId: string) => void
}

const formatLastActive = (iso: string): string => {
  try {
    const dt = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - dt.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h ago`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `${diffD}d ago`
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export const UserProfilePage = ({ userId, onBack, onStartChat }: UserProfilePageProps) => {
  const [profile, setProfile] = useState<UserPublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    userService.getUserInfo(userId).then((res) => {
      if (!cancelled) {
        setProfile(res.data ?? null)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) {
        setError('Failed to load profile')
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [userId])

  const handleStartChat = async () => {
    setStarting(true)
    try {
      onStartChat(userId)
    } finally {
      setStarting(false)
    }
  }

  const displayName = profile?.fullName || profile?.username || '...'

  return (
    <div className="flex flex-col h-full bg-surface-base animate-fadeIn">
      <div className="flex items-center gap-3 px-3 sm:px-5 py-3 sm:py-4 border-b border-line-subtle bg-surface">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-surface-overlay transition-colors text-ink-secondary"
          aria-label="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-ink-primary">Profile</span>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-ink-tertiary">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="text-primary-500 text-sm hover:underline">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && profile && (
        <div className="flex-1 overflow-y-auto">
          <div className="relative h-28 sm:h-36 bg-gradient-signature flex-shrink-0" />

          <div className="px-4 sm:px-6 -mt-12 sm:-mt-14 pb-8 max-w-2xl mx-auto w-full">
            <div className="flex flex-col items-center mb-6">
              <div className="ring-4 ring-surface-base rounded-full mb-3">
                <Avatar
                  name={displayName}
                  src={profile.avatar}
                  size="xl"
                  status={profile.isOnline ? 'online' : undefined}
                  className="w-20 h-20 sm:w-24 sm:h-24 text-2xl"
                />
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-ink-primary text-center">{displayName}</h1>
              <p className="text-sm text-ink-tertiary mt-0.5">@{profile.username}</p>

              <div className={`mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                ${profile.isOnline
                  ? 'bg-status-success/10 text-status-success border border-status-success/30'
                  : 'bg-surface-overlay text-ink-tertiary border border-line'}`}>
                <span className={`w-2 h-2 rounded-full ${profile.isOnline ? 'bg-status-success' : 'bg-ink-tertiary'}`} />
                {profile.isOnline ? 'Online' : 'Offline'}
              </div>
            </div>

            {profile.bio && (
              <div className="bg-surface rounded-2xl border border-line-subtle p-4 mb-3 shadow-soft-sm">
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-ink-tertiary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs text-ink-tertiary font-medium mb-1">Bio</p>
                    <p className="text-sm text-ink-secondary leading-relaxed">{profile.bio}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-surface rounded-2xl border border-line-subtle shadow-soft-sm overflow-hidden mb-3">
              <InfoRow
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                label="Username"
                value={`@${profile.username}`}
              />
              {!profile.isOnline && profile.lastActiveAt && (
                <>
                  <div className="h-px bg-line-subtle mx-4" />
                  <InfoRow
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                    label="Last seen"
                    value={formatLastActive(profile.lastActiveAt)}
                  />
                </>
              )}
              {profile.createdAt && (
                <>
                  <div className="h-px bg-line-subtle mx-4" />
                  <InfoRow
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    }
                    label="Member since"
                    value={formatDate(profile.createdAt)}
                  />
                </>
              )}
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={starting}
              onClick={handleStartChat}
              className="mt-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Send Message
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-3 px-4 py-3">
    <span className="text-ink-tertiary flex-shrink-0">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs text-ink-tertiary font-medium">{label}</p>
      <p className="text-sm text-ink-primary truncate">{value}</p>
    </div>
  </div>
)
