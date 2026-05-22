import { useChatStore, useChatUIStore, MessageType} from '@chat/shared'

export const ComposerPreview = () => {
  const replyTo = useChatUIStore((s) => s.replyTo)
  const editingId = useChatUIStore((s) => s.editingMessageId)
  const setReplyTo = useChatUIStore((s) => s.setReplyTo)
  const setEditing = useChatUIStore((s) => s.setEditingMessageId)
  const setInput = useChatUIStore((s) => s.setMessageInput)
  const editingMsg = useChatStore((s) =>
    editingId ? s.messages.find((m) => m.id === editingId) : null,
  )

  if (!replyTo && !editingMsg) return null

  const isEdit = !!editingMsg
  const label = isEdit ? 'Editing message' : `Replying to ${replyTo?.senderName || 'message'}`
  const content = isEdit
    ? editingMsg!.content
    : replyTo?.type === MessageType.IMAGE
      ? '📷 Photo'
      : replyTo?.content

  const cancel = () => {
    if (isEdit) {
      setEditing(null)
      setInput('')
    } else {
      setReplyTo(null)
    }
  }

  return (
    <div className="mb-2 flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-overlay border-l-2 border-primary-400">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-primary">{label}</p>
        <p className="text-xs text-ink-secondary truncate">{content}</p>
      </div>
      <button
        type="button"
        onClick={cancel}
        className="w-6 h-6 rounded-full hover:bg-surface flex items-center justify-center text-ink-tertiary hover:text-ink-primary"
        aria-label="Cancel"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
