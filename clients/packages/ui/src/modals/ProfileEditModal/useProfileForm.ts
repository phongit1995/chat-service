import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@chat/shared'
import type { UpdateProfileDTO } from '@chat/shared'

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_AVATAR_SIZE = 5 * 1024 * 1024

export const useProfileForm = (isOpen: boolean, onClose: () => void) => {
  const { user, updateProfile, uploadAvatar } = useAuthStore()

  const [formData, setFormData] = useState<UpdateProfileDTO>({
    fullName: user?.fullName || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    avatar: user?.avatar || '',
  })
  const [previewUrl, setPreviewUrl] = useState(user?.avatar || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setFormData({
      fullName: user?.fullName || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
      dateOfBirth: user?.dateOfBirth || '',
      avatar: user?.avatar || '',
    })
    setPreviewUrl(user?.avatar || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('Image size must be less than 5MB')
      return
    }
    if (!VALID_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, GIF, and WEBP images are supported')
      return
    }

    try {
      setIsUploading(true)
      const response = await uploadAvatar(file)
      const imageUrl = response.data?.secureUrl || response.data?.url
      if (imageUrl) {
        setFormData((prev) => ({ ...prev, avatar: imageUrl }))
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      const response = await updateProfile(formData)
      if (response.success && response.data) {
        toast.success('Profile updated successfully')
        onClose()
      }
    } catch (error: unknown) {
      console.error('Failed to update profile:', error)
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to update profile'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    user,
    formData,
    previewUrl,
    isLoading,
    isUploading,
    handleChange,
    handleImageChange,
    handleSubmit,
  }
}
