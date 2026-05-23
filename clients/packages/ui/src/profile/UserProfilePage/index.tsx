import { useEffect, useState } from 'react'
import { useUserProfileStore, ProfileAction } from '@chat/shared'
import { Avatar } from '../../common'
import { InfoRow } from './InfoRow'
import { UserProfileActions } from './UserProfileActions'
import { formatLastActive, formatProfileDate, relationshipLabel } from './profile.utils'
import type { UserProfilePageProps } from './UserProfilePage.types'

export type { UserProfilePageProps } from './UserProfilePage.types'

export const UserProfilePage = ({ userId, onBack, onStartChat, variant = 'page' }: UserProfilePageProps) => {
  const isModal = variant === 'modal'
  const profile = useUserProfileStore((s) => s.profile)
  const loading = useUserProfileStore((s) => s.loading)
  const error = useUserProfileStore((s) => s.error)
  const pendingAction = useUserProfileStore((s) => s.pendingAction)
  const load = useUserProfileStore((s) => s.load)
  const reset = useUserProfileStore((s) => s.reset)
  const sendRequest = useUserProfileStore((s) => s.sendRequest)
  const accept = useUserProfileStore((s) => s.accept)
  const reject = useUserProfileStore((s) => s.reject)
  const cancel = useUserProfileStore((s) => s.cancel)
  const unfriend = useUserProfileStore((s) => s.unfriend)
  const block = useUserProfileStore((s) => s.block)
  const unblock = useUserProfileStore((s) => s.unblock)

  const [starting, setStarting] = useState(false)

  useEffect(() => {
    load(userId)
    return () => reset()
  }, [userId, load, reset])

  const handleStartChat = async () => {
    setStarting(true)
    try {
      onStartChat(userId)
    } finally {
      setStarting(false)
    }
  }

  const isPending = (key: ProfileAction) => pendingAction === key
  const isAnyPending = pendingAction !== null
  const rel = profile?.relationship
  const status = rel?.status ?? 'none'
  const isBlockedEitherWay = status === 'blocked_by_me' || status === 'blocked_by_them'
  const isSelf = status === 'self'
  const canChat = !isBlockedEitherWay && !isSelf
  const displayName = profile?.fullName || profile?.username || '...'

  return (
    <div className="flex flex-col h-full bg-surface-base animate-fadeIn relative">
      {isModal && (
        <button
          onClick={onBack}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      {!isModal && (
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
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-ink-tertiary">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
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

              <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    profile.isOnline
                      ? 'bg-status-success/10 text-status-success border border-status-success/30'
                      : 'bg-surface-overlay text-ink-tertiary border border-line'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${profile.isOnline ? 'bg-status-success' : 'bg-ink-tertiary'}`}
                  />
                  {profile.isOnline ? 'Online' : 'Offline'}
                </div>
                {rel && !isSelf && status !== 'none' && (
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${relationshipLabel(status).color}`}>
                    {relationshipLabel(status).text}
                  </div>
                )}
              </div>
            </div>

            {profile.bio && (
              <div className="bg-surface rounded-2xl border border-line-subtle p-4 mb-3 shadow-soft-sm">
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-ink-tertiary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    }
                    label="Member since"
                    value={formatProfileDate(profile.createdAt)}
                  />
                </>
              )}
            </div>

            {status === 'blocked_by_them' && (
              <div className="bg-status-danger/5 border border-status-danger/20 rounded-2xl p-4 mb-3 text-center">
                <p className="text-sm text-ink-secondary">This user is unavailable.</p>
              </div>
            )}

            <UserProfileActions
              rel={rel}
              isSelf={isSelf}
              canChat={canChat}
              starting={starting}
              isPending={isPending}
              isAnyPending={isAnyPending}
              onStartChat={handleStartChat}
              onSendRequest={sendRequest}
              onAccept={accept}
              onReject={reject}
              onCancel={cancel}
              onUnfriend={unfriend}
              onBlock={block}
              onUnblock={unblock}
            />
          </div>
        </div>
      )}
    </div>
  )
}
