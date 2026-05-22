import { useState } from 'react'
import type { Message } from '@chat/shared'
import { getDesktopBridge, parseImageMeta, MessageStatus as MsgStatus } from '@chat/shared'
import { ImageLightbox } from '../ImageLightbox'

interface MessageImageBubbleProps {
  message: Message
  isOwnMessage: boolean
  isFirstInStreak: boolean
  radius: string
  onImageLoaded?: () => void
}

export const MessageImageBubble = ({
  message,
  isOwnMessage,
  isFirstInStreak,
  radius,
  onImageLoaded,
}: MessageImageBubbleProps) => {
  const imageMeta = parseImageMeta(message.metadata)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (!imageMeta) return null

  const handleClick = () => {
    if (message.status === MsgStatus.UPLOADING) return
    const desktop = getDesktopBridge()
    if (desktop?.openImageViewer) {
      desktop.openImageViewer(imageMeta.url, imageMeta.fileName || '')
    } else {
      setLightboxOpen(true)
    }
  }

  return (
    <>
      <div
        style={{ borderRadius: radius }}
        className={[
          'overflow-hidden relative shadow-soft-sm',
          message.status === MsgStatus.FAILED ? 'opacity-70' : '',
          isFirstInStreak ? 'animate-slideIn' : '',
        ].join(' ')}
      >
        <img
          src={imageMeta.url}
          alt={imageMeta.fileName || 'image'}
          onLoad={onImageLoaded}
          onClick={handleClick}
          style={{
            aspectRatio:
              imageMeta.width && imageMeta.height ? `${imageMeta.width} / ${imageMeta.height}` : '4 / 3',
            width: 280,
            maxWidth: '100%',
            maxHeight: 360,
            cursor: message.status === MsgStatus.UPLOADING ? 'default' : 'zoom-in',
          }}
          className="block object-cover bg-surface-overlay"
        />
        {message.status === MsgStatus.UPLOADING && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <svg className="w-8 h-8 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>

      {message.content.trim() && (
        <div
          style={{ borderRadius: radius }}
          className={[
            'mt-1 px-3.5 py-2 break-words shadow-soft-sm',
            isOwnMessage ? 'bg-gradient-signature text-on-gradient' : 'bg-surface-overlay text-ink-primary',
          ].join(' ')}
        >
          <p className="leading-relaxed text-[14px] sm:text-[15px] whitespace-pre-wrap">{message.content}</p>
        </div>
      )}

      {lightboxOpen && (
        <ImageLightbox
          url={imageMeta.url}
          alt={imageMeta.fileName}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}
