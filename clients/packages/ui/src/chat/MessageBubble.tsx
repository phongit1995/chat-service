import { useState } from 'react'
import { Message, useChatStore } from '@chat/shared'
import { Avatar } from '../common'
import { ImageLightbox } from './ImageLightbox'
import { ReactionButton } from './ReactionButton'
import { MessageActionsMenu } from './MessageActionsMenu'
import { getEmojiJumboSize, splitIntoSegments } from '@chat/shared'
import { parseImageMeta } from '@chat/shared'

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
  isLastOwnMessage?: boolean
  conversationSeen?: boolean
  isGroup?: boolean
  isFirstInStreak?: boolean
  isLastInStreak?: boolean
  showTime?: boolean
  myUserId?: string
  onReact?: (messageId: string, type: string) => void
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export const MessageBubble = ({
  message,
  isOwnMessage,
  isLastOwnMessage = false,
  conversationSeen = false,
  isGroup = false,
  isFirstInStreak = true,
  isLastInStreak = true,
  showTime = true,
  myUserId = '',
  onReact,
}: MessageBubbleProps) => {
  const renderStatus = () => {
    if (!isOwnMessage) return null

    if (message.status === 'sending') {
      return (
        <span title="Sending" className="inline-flex items-center text-ink-tertiary">
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </span>
      )
    }

    if (message.status === 'failed') {
      return (
        <span title="Failed to send" className="inline-flex items-center text-status-danger">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </span>
      )
    }

    if (!isLastOwnMessage) return null

    if (conversationSeen) {
      return (
        <span title="Seen" className="inline-flex items-center font-bold tracking-tighter text-primary-500 text-[12px]">
          ✓✓
        </span>
      )
    }

    return (
      <span title="Sent" className="inline-flex items-center text-ink-tertiary text-[12px]">
        ✓
      </span>
    )
  }

  const emojiJumboSize = getEmojiJumboSize(message.content)
  const isEmojiOnly = emojiJumboSize > 0
  const isImage = message.type === 'image'
  const imageMeta = isImage ? parseImageMeta(message.metadata) : null
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [bubbleHover, setBubbleHover] = useState(false)
  const canReact = !!onReact && isLastInStreak && message.status !== 'sending' && message.status !== 'uploading' && message.status !== 'failed'
  const isSent = message.status === 'sent' || !message.status
  const replyToMessage = useChatStore((s) => message.replyToId ? s.messages.find((m) => m.id === message.replyToId) : null)
  const isEdited = message.updatedAt && message.createdAt && message.updatedAt !== message.createdAt && (message.type === 'text')

  const radius = (() => {
    const lg = '20px'
    const sm = '6px'
    if (isOwnMessage) {
      const tr = isFirstInStreak ? lg : sm
      const br = isLastInStreak ? lg : sm
      return `${lg} ${tr} ${br} ${lg}`
    }
    const tl = isFirstInStreak ? lg : sm
    const bl = isLastInStreak ? lg : sm
    return `${tl} ${lg} ${lg} ${bl}`
  })()

  const showAvatar = !isOwnMessage && isLastInStreak
  const showName = !isOwnMessage && isGroup && isFirstInStreak && !!message.senderName
  const marginTop = isFirstInStreak ? 'mt-3' : 'mt-1'

  return (
    <div className={`${marginTop} flex ${isOwnMessage ? 'justify-end' : 'justify-start'} gap-2 group`}>
      {!isOwnMessage && (
        <div className="w-8 flex-shrink-0 flex items-end">
          {showAvatar ? (
            <Avatar name={message.senderName || ''} src={message.senderAvatar} size="sm" />
          ) : null}
        </div>
      )}

      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[80%] sm:max-w-[75%] md:max-w-[65%]`}>
        {showName && (
          <p className="text-[11px] font-semibold mb-0.5 ml-2 text-ink-tertiary">
            {message.senderName}
          </p>
        )}

        {replyToMessage && (
          <div
            className={`mb-1 px-2 py-1 text-[11px] rounded-md border-l-2 ${
              isOwnMessage
                ? 'border-primary-400 bg-surface-overlay text-ink-secondary mr-1'
                : 'border-primary-400 bg-surface-overlay text-ink-secondary ml-1'
            } max-w-[260px] truncate`}
            title={replyToMessage.content}
          >
            <span className="font-semibold mr-1">↪ {replyToMessage.senderName || 'You'}:</span>
            <span className="opacity-80">
              {replyToMessage.type === 'image' ? '📷 Photo' : replyToMessage.content}
            </span>
          </div>
        )}

        <div
          className="relative"
          onMouseEnter={() => setBubbleHover(true)}
          onMouseLeave={() => setBubbleHover(false)}
        >
        {isSent && (
          <MessageActionsMenu
            message={message}
            isOwnMessage={isOwnMessage}
            visible={bubbleHover}
          />
        )}
        {canReact && onReact && (
          <ReactionButton
            reactions={message.reactions}
            visible={bubbleHover}
            myUserId={myUserId}
            isOwnMessage={isOwnMessage}
            onSelect={(type) => onReact(message.id, type)}
          />
        )}
        <div className="relative">
        {isImage && imageMeta ? (
          <>
            <div
              style={{ borderRadius: radius }}
              className={[
                'overflow-hidden relative shadow-soft-sm',
                message.status === 'failed' ? 'opacity-70' : '',
                isFirstInStreak ? 'animate-slideIn' : '',
              ].join(' ')}
            >
              <img
                src={imageMeta.url}
                alt={imageMeta.fileName || 'image'}
                onClick={() => message.status !== 'uploading' && setLightboxOpen(true)}
                style={{
                  aspectRatio: imageMeta.width && imageMeta.height ? `${imageMeta.width} / ${imageMeta.height}` : '4 / 3',
                  width: 280,
                  maxWidth: '100%',
                  maxHeight: 360,
                  cursor: message.status === 'uploading' ? 'default' : 'zoom-in',
                }}
                className="block object-cover bg-surface-overlay"
              />
              {message.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <svg className="w-8 h-8 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
        ) : (
          <div
            style={{ borderRadius: isEmojiOnly ? 0 : radius }}
            className={[
              'break-words',
              isEmojiOnly
                ? 'px-1 py-0 bg-transparent shadow-none'
                : [
                    'px-3.5 py-2 shadow-soft-sm',
                    isOwnMessage
                      ? 'bg-gradient-signature text-on-gradient'
                      : 'bg-surface-overlay text-ink-primary',
                  ].join(' '),
              message.status === 'failed' ? 'opacity-70' : '',
              isFirstInStreak ? 'animate-slideIn' : '',
            ].join(' ')}
          >
            <p
              className={
                isEmojiOnly
                  ? 'leading-tight whitespace-pre-wrap'
                  : 'leading-relaxed text-[14px] sm:text-[15px] whitespace-pre-wrap'
              }
              style={isEmojiOnly ? { fontSize: `${emojiJumboSize}rem`, lineHeight: 1.15, letterSpacing: '0.18em' } : undefined}
            >
              {isEmojiOnly
                ? message.content
                : splitIntoSegments(message.content).map((seg, i) =>
                    seg.isEmoji ? (
                      <span
                        key={i}
                        style={{ fontSize: '1.6em', lineHeight: 1, verticalAlign: 'middle', display: 'inline-block' }}
                      >
                        {seg.text}
                      </span>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    )
                  )
              }
            </p>
          </div>
        )}
        </div>
        </div>

        {(showTime || message.status === 'sending' || message.status === 'failed') && (
          <div
            className={`mt-0.5 px-1 flex items-center gap-1.5 text-[11px] ${
              isOwnMessage ? 'justify-end' : 'justify-start text-ink-tertiary'
            }`}
          >
            <span className="text-ink-tertiary">{formatTime(message.createdAt)}</span>
            {isEdited && <span className="text-ink-tertiary italic">edited</span>}
            {renderStatus()}
          </div>
        )}
      </div>
    </div>
  )
}
