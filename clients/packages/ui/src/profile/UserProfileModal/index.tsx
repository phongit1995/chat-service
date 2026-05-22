import { Modal } from '../../common'
import { UserProfilePage } from '../UserProfilePage'

interface UserProfileModalProps {
  isOpen: boolean
  userId: string | null
  onClose: () => void
  onStartChat: (userId: string) => void
}

export const UserProfileModal = ({ isOpen, userId, onClose, onStartChat }: UserProfileModalProps) => {
  if (!userId) return null
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" ariaLabel="User profile">
      <UserProfilePage
        userId={userId}
        onBack={onClose}
        onStartChat={(uid) => { onClose(); onStartChat(uid) }}
        variant="modal"
      />
    </Modal>
  )
}
