import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  gradientBorder?: boolean
}

export const Card = ({
  padding = 'md',
  shadow = 'md',
  gradientBorder = false,
  className = '',
  children,
  ...props
}: CardProps) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }
  const shadows = {
    none: '',
    sm: 'shadow-soft-sm',
    md: 'shadow-soft-md',
    lg: 'shadow-soft-lg',
    xl: 'shadow-soft-xl',
  }

  return (
    <div
      className={[
        'bg-surface rounded-xl',
        paddings[padding],
        shadows[shadow],
        gradientBorder ? 'border-gradient' : 'border border-line-subtle',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
