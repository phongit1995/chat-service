import type { RelationshipInfo } from '@chat/shared'
import { ProfileAction } from '@chat/shared'
import { Button } from '../../common'

interface UserProfileActionsProps {
  rel: RelationshipInfo | undefined
  isSelf: boolean
  canChat: boolean
  starting: boolean
  isPending: (key: ProfileAction) => boolean
  isAnyPending: boolean
  onStartChat: () => void
  onSendRequest: () => void
  onAccept: () => void
  onReject: () => void
  onCancel: () => void
  onUnfriend: () => void
  onBlock: () => void
  onUnblock: () => void
}

export const UserProfileActions = ({
  rel,
  isSelf,
  canChat,
  starting,
  isPending,
  isAnyPending,
  onStartChat,
  onSendRequest,
  onAccept,
  onReject,
  onCancel,
  onUnfriend,
  onBlock,
  onUnblock,
}: UserProfileActionsProps) => {
  if (isSelf) return null

  const status = rel?.status ?? 'none'

  return (
    <div className="space-y-2 mt-2">
      {canChat && (
        <Button variant="primary" size="lg" fullWidth isLoading={starting} onClick={onStartChat}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Send Message
        </Button>
      )}

      {status === 'none' && (
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          isLoading={isPending(ProfileAction.SEND)}
          disabled={isAnyPending && !isPending(ProfileAction.SEND)}
          onClick={onSendRequest}
        >
          Add friend
        </Button>
      )}

      {status === 'pending_outgoing' && (
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          isLoading={isPending(ProfileAction.CANCEL)}
          disabled={isAnyPending && !isPending(ProfileAction.CANCEL)}
          onClick={onCancel}
        >
          Cancel friend request
        </Button>
      )}

      {status === 'pending_incoming' && (
        <>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            isLoading={isPending(ProfileAction.ACCEPT)}
            disabled={isAnyPending && !isPending(ProfileAction.ACCEPT)}
            onClick={onAccept}
          >
            Accept friend request
          </Button>
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            isLoading={isPending(ProfileAction.REJECT)}
            disabled={isAnyPending && !isPending(ProfileAction.REJECT)}
            onClick={onReject}
          >
            Reject
          </Button>
        </>
      )}

      {status === 'friend' && (
        <Button
          variant="ghost"
          size="lg"
          fullWidth
          isLoading={isPending(ProfileAction.UNFRIEND)}
          disabled={isAnyPending && !isPending(ProfileAction.UNFRIEND)}
          onClick={onUnfriend}
        >
          Unfriend
        </Button>
      )}

      {status === 'blocked_by_me' ? (
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          isLoading={isPending(ProfileAction.UNBLOCK)}
          disabled={isAnyPending && !isPending(ProfileAction.UNBLOCK)}
          onClick={onUnblock}
        >
          Unblock
        </Button>
      ) : (
        status !== 'blocked_by_them' && (
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            isLoading={isPending(ProfileAction.BLOCK)}
            disabled={isAnyPending && !isPending(ProfileAction.BLOCK)}
            onClick={onBlock}
          >
            Block
          </Button>
        )
      )}
    </div>
  )
}
