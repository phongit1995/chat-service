import { useRef } from 'react'
import {
  Button,
  ChatHeader,
  ComposerPreview,
  DragOverlay,
  EmojiPickerPopover,
  ErrorBoundary,
  MessageList,
  useComposerEditor,
  useImageDrop,
  useImagePaste,
  validateImageFile,
} from '@chat/ui'
import { ALLOWED_IMAGE_MIMES_ACCEPT } from '@chat/shared'
import type { ChatAreaProps } from './ChatArea.types'

export type { ChatAreaProps } from './ChatArea.types'

export const ChatArea = ({
  conversation,
  messages,
  messageInput,
  typingUsers,
  user,
  onSetMessageInput,
  onSendMessage,
  onSendImage,
  onBack,
  onOpenProfile,
}: ChatAreaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File | null | undefined) => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    const err = validateImageFile(file)
    if (err) {
      alert(err)
      return
    }
    onSendImage(file).catch((e) => console.error('send image failed', e))
  }

  const { dragActive } = useImageDrop(handleFileSelect, [conversation.id])
  const handlePaste = useImagePaste(handleFileSelect)

  const { editableRef, insertEmoji, composerEvents } = useComposerEditor({
    messageInput,
    onSetMessageInput,
    onSendMessage,
  })

  return (
    <>
      {dragActive && <DragOverlay />}
      <ChatHeader conversation={conversation} onBack={onBack} onOpenProfile={onOpenProfile} />
      <ErrorBoundary scope="message-list">
        <MessageList
          conversation={conversation}
          messages={messages}
          typingUsers={typingUsers}
          user={user}
          onOpenProfile={onOpenProfile}
        />
      </ErrorBoundary>

      <div
        className="border-t border-line-subtle bg-surface/95 backdrop-blur-sm px-3 sm:px-4 pt-3 sm:pt-4"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_MIMES_ACCEPT}
          hidden
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
        />
        <ComposerPreview />
        <form onSubmit={onSendMessage} className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach image"
            title="Gửi ảnh — JPG / PNG / GIF / WEBP, tối đa 2 MB sau khi nén"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-overlay transition-colors shrink-0"
          >
            <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          <div
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            {...composerEvents}
            onPaste={handlePaste}
            data-placeholder="Type a message…"
            className="message-input flex-1 min-w-0 min-h-[40px] max-h-[120px] overflow-y-auto cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-ink-tertiary empty:before:pointer-events-none"
            style={{ lineHeight: '1.5', wordBreak: 'break-word', outline: 'none', whiteSpace: 'pre-wrap' }}
          />

          <EmojiPickerPopover onSelect={insertEmoji} />

          <Button
            type="submit"
            disabled={!messageInput.trim()}
            variant="primary"
            size="md"
            aria-label="Send"
            className="!px-4 sm:!px-5 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </form>
      </div>
    </>
  )
}
