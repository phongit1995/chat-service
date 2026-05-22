import { useEffect, useRef, useState } from 'react'
import type { Message } from '@chat/shared'
import { useChatStore, useChatUIStore, MessageStatus, MessageType} from '@chat/shared'

interface Props {
  message: Message
  isOwnMessage: boolean
  visible: boolean
}

export const MessageActionsMenu = ({ message, isOwnMessage, visible }: Props) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const setReplyTo = useChatUIStore((s) => s.setReplyTo)
  const setEditingMessageId = useChatUIStore((s) => s.setEditingMessageId)
  const setMessageInput = useChatUIStore((s) => s.setMessageInput)
  const deleteMessage = useChatStore((s) => s.deleteMessage)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!visible && !open) return null

  const canEdit = isOwnMessage && message.type === MessageType.TEXT
  const canDelete = isOwnMessage
  const canReply = message.status === MessageStatus.SENT || !message.status

  const handleReply = () => {
    setReplyTo(message)
    setOpen(false)
  }
  const handleEdit = () => {
    setEditingMessageId(message.id)
    setMessageInput(message.content)
    setOpen(false)
  }
  const handleDelete = async () => {
    setOpen(false)
    if (!confirm('Delete this message?')) return
    try {
      await deleteMessage(message.id)
    } catch {}
  }

  return (
    <div
      ref={wrapRef}
      className={`absolute -top-3 ${isOwnMessage ? '-left-2' : '-right-2'} z-20`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="w-6 h-6 rounded-full bg-surface shadow-soft-sm border border-line-subtle flex items-center justify-center text-ink-tertiary hover:text-ink-primary"
        aria-label="Message actions"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="16" cy="10" r="1.5" />
        </svg>
      </button>
      {open && (
        <div
          className={`absolute top-full mt-1 ${isOwnMessage ? 'left-0' : 'right-0'} min-w-[140px] py-1 rounded-lg bg-surface shadow-soft-md border border-line-subtle z-30`}
        >
          {canReply && (
            <button
              onClick={handleReply}
              className="w-full px-3 py-1.5 text-left text-sm text-ink-primary hover:bg-surface-overlay flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Reply
            </button>
          )}
          {canEdit && (
            <button
              onClick={handleEdit}
              className="w-full px-3 py-1.5 text-left text-sm text-ink-primary hover:bg-surface-overlay flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="w-full px-3 py-1.5 text-left text-sm text-status-danger hover:bg-surface-overlay flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
              </svg>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
