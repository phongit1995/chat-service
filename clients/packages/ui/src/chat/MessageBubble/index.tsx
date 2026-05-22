import { useState } from 'react'
import { useChatStore, MessageStatus as MsgStatus, MessageType} from '@chat/shared'
import { Avatar } from '../../common'
import { ReactionButton } from '../ReactionButton'
import { MessageActionsMenu } from '../MessageActionsMenu'
import { MessageStatus } from './MessageStatus'
import { MessageReplyQuote } from './MessageReplyQuote'
import { MessageImageBubble } from './MessageImageBubble'
import { MessageTextBubble } from './MessageTextBubble'
import { computeBubbleRadius, formatBubbleTime } from './bubbleRadius.utils'
import type { MessageBubbleProps } from './MessageBubble.types'

export type { MessageBubbleProps } from './MessageBubble.types'

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
  onOpenProfile,
  onImageLoaded,
}: MessageBubbleProps) => {
  const [bubbleHover, setBubbleHover] = useState(false)
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false)

  const isImage = message.type === MessageType.IMAGE
  const canReact =
    !!onReact &&
    message.status !== MsgStatus.SENDING &&
    message.status !== MsgStatus.UPLOADING &&
    message.status !== MsgStatus.FAILED
  const isSent = message.status === MsgStatus.SENT || !message.status
  const replyToMessage = useChatStore((s) =>
    message.replyToId ? s.messages.find((m) => m.id === message.replyToId) : null,
  )
  const isEdited =
    message.updatedAt &&
    message.createdAt &&
    message.updatedAt !== message.createdAt &&
    message.type === MessageType.TEXT

  const radius = computeBubbleRadius(isOwnMessage, isFirstInStreak, isLastInStreak)

  const showAvatar = !isOwnMessage && isLastInStreak
  const showName = !isOwnMessage && isGroup && isFirstInStreak && !!message.senderName
  const marginTop = isFirstInStreak ? 'mt-3' : 'mt-1'
  const hasReactions =
    !!message.reactions &&
    Object.values(message.reactions).some((u) => Array.isArray(u) && u.length > 0)
  const marginBottom = hasReactions ? 'mb-3' : ''

  return (
    <div
      className={`${marginTop} ${marginBottom} flex ${
        isOwnMessage ? 'justify-end' : 'justify-start'
      } gap-2 group`}
    >
      {!isOwnMessage && (
        <div className="w-8 flex-shrink-0 flex items-end">
          {showAvatar ? (
            onOpenProfile ? (
              <button
                type="button"
                onClick={() => onOpenProfile(message.senderId)}
                className="rounded-full hover:opacity-80 transition-opacity"
                title={message.senderName || ''}
              >
                <Avatar name={message.senderName || ''} src={message.senderAvatar} size="sm" />
              </button>
            ) : (
              <Avatar name={message.senderName || ''} src={message.senderAvatar} size="sm" />
            )
          ) : null}
        </div>
      )}

      <div
        className={`flex flex-col ${
          isOwnMessage ? 'items-end' : 'items-start'
        } max-w-[80%] sm:max-w-[75%] md:max-w-[65%]`}
      >
        {showName &&
          (onOpenProfile ? (
            <button
              type="button"
              onClick={() => onOpenProfile(message.senderId)}
              className="text-[11px] font-semibold mb-0.5 ml-2 text-ink-tertiary hover:text-ink-primary hover:underline transition-colors"
            >
              {message.senderName}
            </button>
          ) : (
            <p className="text-[11px] font-semibold mb-0.5 ml-2 text-ink-tertiary">
              {message.senderName}
            </p>
          ))}

        {replyToMessage && (
          <MessageReplyQuote replyTo={replyToMessage} isOwnMessage={isOwnMessage} />
        )}

        <div
          className="relative"
          onMouseEnter={() => setBubbleHover(true)}
          onMouseLeave={() => setBubbleHover(false)}
        >
          {isEdited && (
            <span
              className={`absolute bottom-1 text-[10px] italic text-ink-tertiary whitespace-nowrap pointer-events-none ${
                isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'
              }`}
            >
              edited
            </span>
          )}

          {isSent && (
            <MessageActionsMenu
              message={message}
              isOwnMessage={isOwnMessage}
              visible={bubbleHover && !reactionPickerOpen}
            />
          )}

          {canReact && onReact && (
            <ReactionButton
              reactions={message.reactions}
              visible={bubbleHover}
              myUserId={myUserId}
              isOwnMessage={isOwnMessage}
              onSelect={(type) => onReact(message.id, type)}
              onOpenChange={setReactionPickerOpen}
            />
          )}

          <div className="relative">
            {isImage ? (
              <MessageImageBubble
                message={message}
                isOwnMessage={isOwnMessage}
                isFirstInStreak={isFirstInStreak}
                radius={radius}
                onImageLoaded={onImageLoaded}
              />
            ) : (
              <MessageTextBubble
                message={message}
                isOwnMessage={isOwnMessage}
                isFirstInStreak={isFirstInStreak}
                radius={radius}
              />
            )}
          </div>
        </div>

        {(showTime || message.status === MsgStatus.SENDING || message.status === MsgStatus.FAILED) && (
          <div
            className={`mt-0.5 px-1 flex items-center gap-1.5 text-[11px] ${
              isOwnMessage ? 'justify-end' : 'justify-start text-ink-tertiary'
            }`}
          >
            <span className="text-ink-tertiary">{formatBubbleTime(message.createdAt)}</span>
            <MessageStatus
              message={message}
              isOwnMessage={isOwnMessage}
              isLastOwnMessage={isLastOwnMessage}
              conversationSeen={conversationSeen}
            />
          </div>
        )}
      </div>
    </div>
  )
}
