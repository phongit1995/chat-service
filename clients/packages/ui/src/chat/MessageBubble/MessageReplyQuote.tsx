import type { Message } from '@chat/shared'
import { MessageType } from '@chat/shared'

interface MessageReplyQuoteProps {
  replyTo: Message
  isOwnMessage: boolean
}

export const MessageReplyQuote = ({ replyTo, isOwnMessage }: MessageReplyQuoteProps) => (
  <div
    className={`mb-1 px-2 py-1 text-[11px] rounded-md border-l-2 border-primary-400 bg-surface-overlay text-ink-secondary ${
      isOwnMessage ? 'mr-1' : 'ml-1'
    } max-w-[260px] truncate`}
    title={replyTo.content}
  >
    <span className="font-semibold mr-1">↪ {replyTo.senderName || 'You'}:</span>
    <span className="opacity-80">
      {replyTo.type === MessageType.IMAGE ? '📷 Photo' : replyTo.content}
    </span>
  </div>
)
