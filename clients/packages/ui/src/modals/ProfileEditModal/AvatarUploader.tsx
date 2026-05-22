import { ChangeEvent, useRef } from 'react'

interface AvatarUploaderProps {
  previewUrl: string
  fallbackInitial: string
  isUploading: boolean
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

export const AvatarUploader = ({ previewUrl, fallbackInitial, isUploading, onChange }: AvatarUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <div
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-signature flex items-center justify-center text-white text-3xl font-bold cursor-pointer overflow-hidden shadow-soft-md ring-4 ring-surface"
          onClick={() => fileInputRef.current?.click()}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            fallbackInitial
          )}
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {isUploading ? (
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white" />
            ) : (
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={onChange}
          className="hidden"
          disabled={isUploading}
        />
      </div>
      <p className="mt-3 text-xs text-ink-tertiary">Click avatar to upload · max 5MB</p>
    </div>
  )
}
