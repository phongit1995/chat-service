import { useState } from 'react'
import { Button, Input, Modal, ModalHeader, ModalBody, ModalFooter } from '../../common'
import { ChangePasswordModal } from '../ChangePasswordModal'
import { AvatarUploader } from './AvatarUploader'
import { useProfileForm } from './useProfileForm'
import type { ProfileEditModalProps } from './ProfileEditModal.types'

export type { ProfileEditModalProps } from './ProfileEditModal.types'

export const ProfileEditModal = ({ isOpen, onClose }: ProfileEditModalProps) => {
  const [showChangePassword, setShowChangePassword] = useState(false)
  const {
    user,
    formData,
    previewUrl,
    isLoading,
    isUploading,
    handleChange,
    handleImageChange,
    handleSubmit,
  } = useProfileForm(isOpen, onClose)

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" ariaLabel="Edit profile">
      <ModalHeader title="Edit Profile" subtitle="Update your personal info" onClose={onClose} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <ModalBody className="space-y-5">
          <AvatarUploader
            previewUrl={previewUrl}
            fallbackInitial={user?.username?.charAt(0).toUpperCase() || 'U'}
            isUploading={isUploading}
            onChange={handleImageChange}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <Input value={user?.username || ''} disabled className="bg-surface-elevated cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <Input value={user?.email || ''} disabled className="bg-surface-elevated cursor-not-allowed" />
            </div>
          </div>

          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wide">
              Full Name
            </label>
            <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Your full name" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wide">
                Phone
              </label>
              <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+84..." />
            </div>
            <div>
              <label htmlFor="dateOfBirth" className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wide">
                Date of Birth
              </label>
              <Input id="dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} />
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wide">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full px-4 py-2.5 border border-line rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition bg-surface text-ink-primary placeholder:text-ink-tertiary resize-none"
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={() => setShowChangePassword(true)}
            className="text-[13px] text-ink-secondary hover:text-ink-primary mr-auto"
          >
            Change password
          </button>
          <Button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="bg-surface-overlay text-ink-primary hover:bg-surface-elevated"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || isUploading} isLoading={isLoading}>
            Save changes
          </Button>
        </ModalFooter>
      </form>

      <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </Modal>
  )
}
