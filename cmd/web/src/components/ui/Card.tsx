import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
}

export const Card = ({ 
  padding = 'md', 
  shadow = 'md', 
  className = '', 
  children, 
  ...props 
}: CardProps) => {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const shadowStyles = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  }

  return (
    <div
      className={`
        bg-white rounded-xl 
        ${paddingStyles[padding]} 
        ${shadowStyles[shadow]} 
        border border-gray-100
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}