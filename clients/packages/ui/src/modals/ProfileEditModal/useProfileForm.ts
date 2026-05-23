import { useEffect, useState, ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useAuthStore, profileSchema, type ProfileFormValues } from '@chat/shared'

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_AVATAR_SIZE = 5 * 1024 * 1024

export const useProfileForm = (isOpen: boolean, onClose: () => void) => {
  const { user, updateProfile, uploadAvatar } = useAuthStore()

  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '')
  const [previewUrl, setPreviewUrl] = useState(user?.avatar || '')
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '')
  const [isUploading, setIsUploading] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
    },
  })

  useEffect(() => {
    if (!isOpen) return
    form.reset({
      fullName: user?.fullName || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
    })
    setAvatarUrl(user?.avatar || '')
    setPreviewUrl(user?.avatar || '')
    setDateOfBirth(user?.dateOfBirth || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

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
        setAvatarUrl(imageUrl)
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

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await updateProfile({
        fullName: values.fullName?.trim() ?? '',
        bio: values.bio?.trim() ?? '',
        phone: values.phone?.trim() ?? '',
        dateOfBirth,
        avatar: avatarUrl,
      })
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
    }
  })

  return {
    user,
    form,
    previewUrl,
    dateOfBirth,
    setDateOfBirth,
    isUploading,
    isLoading: form.formState.isSubmitting,
    handleImageChange,
    onSubmit,
  }
}
