import { ReactNode, useEffect } from 'react'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'spotlight'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: ModalSize
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
  ariaLabel?: string
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  spotlight: 'max-w-2xl',
}

const positionClasses: Record<ModalSize, string> = {
  sm: 'items-center',
  md: 'items-center',
  lg: 'items-center',
  xl: 'items-center',
  spotlight: 'items-start pt-[15vh]',
}

export const Modal = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  ariaLabel,
}: ModalProps) => {
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, closeOnEsc, onClose])

  useEffect(() => {
    if (!isOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdrop = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className={`fixed inset-0 z-50 flex justify-center px-4 ${positionClasses[size]} bg-black/40 backdrop-blur-sm animate-fadeIn`}
      onClick={handleBackdrop}
    >
      <div
        className={`w-full ${sizeClasses[size]} bg-surface rounded-2xl shadow-soft-xl max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

interface ModalHeaderProps {
  title: string
  subtitle?: string
  onClose?: () => void
}

export const ModalHeader = ({ title, subtitle, onClose }: ModalHeaderProps) => (
  <div className="flex items-start justify-between px-6 py-4 border-b border-line-subtle">
    <div className="min-w-0 flex-1">
      <h2 className="text-lg font-semibold text-ink-primary truncate">{title}</h2>
      {subtitle && <p className="text-sm text-ink-tertiary mt-0.5 truncate">{subtitle}</p>}
    </div>
    {onClose && (
      <button
        onClick={onClose}
        className="ml-4 p-1.5 rounded-full text-ink-tertiary hover:bg-surface-overlay hover:text-ink-primary transition-colors"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
)

export const ModalBody = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`flex-1 overflow-y-auto scrollbar-thin px-6 py-5 ${className}`}>{children}</div>
)

export const ModalFooter = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`flex items-center justify-end gap-2 px-6 py-4 border-t border-line-subtle bg-surface-elevated ${className}`}>
    {children}
  </div>
)
