interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'away'
  className?: string
}

export const Avatar = ({ 
  src, 
  alt, 
  name = '', 
  size = 'md', 
  status,
  className = '' 
}: AvatarProps) => {
  const sizeStyles = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl'
  }

  const statusStyles = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500'
  }

  const statusSizeStyles = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4'
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    const names = name.trim().split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const gradients = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-green-500 to-green-600',
    'from-yellow-500 to-yellow-600',
    'from-red-500 to-red-600',
    'from-indigo-500 to-indigo-600',
    'from-teal-500 to-teal-600',
  ]

  const getGradient = (name: string) => {
    const charCode = name.charCodeAt(0) || 0
    return gradients[charCode % gradients.length]
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt || name}
          className={`${sizeStyles[size]} rounded-full object-cover ring-2 ring-white shadow-md`}
        />
      ) : (
        <div
          className={`
            ${sizeStyles[size]} 
            rounded-full 
            bg-gradient-to-br ${getGradient(name)}
            flex items-center justify-center 
            text-white font-bold 
            ring-2 ring-white shadow-md
          `}
        >
          {getInitials(name)}
        </div>
      )}
      {status && (
        <span
          className={`
            absolute bottom-0 right-0 
            ${statusSizeStyles[size]} 
            ${statusStyles[status]} 
            rounded-full 
            ring-2 ring-white
          `}
        />
      )}
    </div>
  )
}