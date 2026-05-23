import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Modal, ModalHeader, ModalBody, ModalFooter } from '../common'
import { authService, changePasswordSchema, type ChangePasswordFormValues } from '@chat/shared'
import toast from 'react-hot-toast'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
) : (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
)

export const ChangePasswordModal = ({ isOpen, onClose }: ChangePasswordModalProps) => {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<ChangePasswordFormValues>({
      resolver: zodResolver(changePasswordSchema),
      defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
    })

  useEffect(() => {
    if (isOpen) reset({ currentPassword: '', newPassword: '', confirm: '' })
  }, [isOpen, reset])

  const onSubmit = async (values: ChangePasswordFormValues) => {
    try {
      await authService.changePassword(values.currentPassword, values.newPassword)
      toast.success('Password changed successfully')
      onClose()
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to change password'
      toast.error(msg)
    }
  }

  const reveal = (open: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto p-1 -m-1 rounded-full hover:bg-surface-overlay text-ink-tertiary hover:text-ink-secondary transition-colors"
      aria-label={open ? 'Hide password' : 'Show password'}
      tabIndex={-1}
    >
      <EyeIcon open={open} />
    </button>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title="Change Password" onClose={onClose} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <ModalBody>
          <div className="space-y-4">
            <Input
              label="Current Password"
              type={showCurrent ? 'text' : 'password'}
              placeholder="••••••••"
              disabled={isSubmitting}
              autoComplete="current-password"
              error={errors.currentPassword?.message}
              rightIcon={reveal(showCurrent, () => setShowCurrent((v) => !v))}
              {...register('currentPassword')}
            />
            <Input
              label="New Password"
              type={showNew ? 'text' : 'password'}
              placeholder="At least 6 characters"
              disabled={isSubmitting}
              autoComplete="new-password"
              error={errors.newPassword?.message}
              rightIcon={reveal(showNew, () => setShowNew((v) => !v))}
              {...register('newPassword')}
            />
            <Input
              label="Confirm New Password"
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              disabled={isSubmitting}
              autoComplete="new-password"
              error={errors.confirm?.message}
              rightIcon={reveal(showConfirm, () => setShowConfirm((v) => !v))}
              {...register('confirm')}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Change Password
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
