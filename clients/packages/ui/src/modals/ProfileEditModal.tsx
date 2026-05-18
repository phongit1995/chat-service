import { useState, useRef, useEffect } from 'react'
import { Button, Input, Modal, ModalHeader, ModalBody, ModalFooter } from '../common'
import { useAuthStore } from '@chat/shared'
import { ChangePasswordModal } from './ChangePasswordModal'
import toast from 'react-hot-toast'
import type { UpdateProfileDTO } from '@chat/shared'

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ProfileEditModal = ({ isOpen, onClose }: ProfileEditModalProps) => {
  const { user, updateProfile, uploadAvatar } = useAuthStore()
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [formData, setFormData] = useState<UpdateProfileDTO>({
    fullName: user?.fullName || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    avatar: user?.avatar || '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(user?.avatar || '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        fullName: user?.fullName || '',
        bio: user?.bio || '',
        phone: user?.phone || '',
        dateOfBirth: user?.dateOfBirth || '',
        avatar: user?.avatar || '',
      })
      setPreviewUrl(user?.avatar || '')
    }
  }, [isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, GIF, and WEBP images are supported')
      return
    }

    try {
      setIsUploading(true)
      const response = await uploadAvatar(file)
      const imageUrl = response.data?.secureUrl || response.data?.url

      if (imageUrl) {
        setFormData(prev => ({ ...prev, avatar: imageUrl }))
        setPreviewUrl(imageUrl)
        toast.success('Image uploaded successfully')
      }
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsLoading(true)
      const response = await updateProfile(formData)

      if (response.success && response.data) {
        toast.success('Profile updated successfully')
        onClose()
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      toast.error(error.response?.data?.error || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" ariaLabel="Edit profile">
      <ModalHeader title="Edit Profile" subtitle="Update your personal info" onClose={onClose} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <ModalBody className="space-y-5">
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-signature flex items-center justify-center text-white text-3xl font-bold cursor-pointer overflow-hidden shadow-soft-md ring-4 ring-surface"
                onClick={handleImageClick}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.username?.charAt(0).toUpperCase() || 'U'
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white" />
                  ) : (
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                className="hidden"
                disabled={isUploading}
              />
            </div>
            <p className="mt-3 text-xs text-ink-tertiary">Click avatar to upload · max 5MB</p>
          </div>

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
          <Button type="button" onClick={onClose} disabled={isLoading}
            className="bg-surface-overlay text-ink-primary hover:bg-surface-elevated">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || isUploading} isLoading={isLoading}>
            Save changes
          </Button>
        </ModalFooter>
      </form>
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </Modal>
  )
}
