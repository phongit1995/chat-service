import { ButtonHTMLAttributes, forwardRef } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    className = '',
    children,
    disabled,
    ...props
  }, ref) => {
    const base =
      'inline-flex items-center justify-center font-semibold rounded-full ' +
      'transition-[transform,box-shadow,background] duration-fast ease-ease-bounce ' +
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2'

    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-gradient-signature text-white shadow-glow-gradient ' +
        'hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-[0.98]',
      secondary:
        'bg-surface text-ink-primary border border-line shadow-soft-sm ' +
        'hover:bg-surface-overlay hover:shadow-soft-md',
      danger:
        'bg-status-danger text-white shadow-soft-md ' +
        'hover:brightness-110 active:scale-[0.98]',
      ghost:
        'bg-transparent text-ink-primary hover:bg-surface-overlay',
    }

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'px-4 py-1.5 text-[13px]',
      md: 'px-6 py-2.5 text-sm',
      lg: 'px-8 py-3 text-base',
    }

    const width = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${width} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
