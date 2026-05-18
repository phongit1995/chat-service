import { InputHTMLAttributes, forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-medium text-ink-secondary mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-ink-tertiary">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full px-5 py-3 text-sm',
              leftIcon ? 'pl-11' : '',
              rightIcon ? 'pr-11' : '',
              'rounded-full bg-surface-overlay text-ink-primary placeholder:text-ink-tertiary',
              'border-[1.5px] border-transparent',
              'transition-[background,border-color,box-shadow] duration-fast ease-ease-smooth',
              'focus:outline-none focus:bg-surface focus:border-primary-500',
              'focus:shadow-[0_0_0_4px_rgba(221,42,123,0.10)]',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              error ? 'border-status-danger focus:border-status-danger focus:shadow-[0_0_0_4px_rgba(239,68,68,0.10)]' : '',
              className,
            ].join(' ')}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center text-ink-tertiary">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-[12px] text-status-danger">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
