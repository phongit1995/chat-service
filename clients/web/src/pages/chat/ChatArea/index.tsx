import { useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  AudioRecorderBar,
  Button,
  ChatHeader,
  ComposerPreview,
  DragOverlay,
  EmojiPickerPopover,
  ErrorBoundary,
  MessageList,
  useAudioRecorder,
  useComposerEditor,
  useImageDrop,
  useImagePaste,
  validateImageFile,
} from '@chat/ui'
import { ALLOWED_IMAGE_MIMES_ACCEPT, validateAudioBlob } from '@chat/shared'
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
  onSendAudio,
  onBack,
  onOpenProfile,
}: ChatAreaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sendingAudio, setSendingAudio] = useState(false)
  const { isRecording, duration, levels, start, stop, cancel } = useAudioRecorder()

  const handleFileSelect = (file: File | null | undefined) => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    const err = validateImageFile(file)
    if (err) {
      toast.error(err)
      return
    }
    onSendImage(file).catch((e) => console.error('send image failed', e))
  }

  const handleMicClick = async () => {
    if (isRecording) return
    try {
      await start()
    } catch (err) {
      console.error('mic permission failed', err)
      toast.error('Microphone access denied')
    }
  }

  const handleAudioSend = async () => {
    if (!isRecording || sendingAudio) return
    try {
      setSendingAudio(true)
      const rec = await stop()
      const err = validateAudioBlob(rec.blob, rec.duration)
      if (err) {
        toast.error(err)
        return
      }
      await onSendAudio(rec.blob, rec.duration, rec.waveform)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Recording failed'
      if (msg !== 'cancelled') toast.error(msg)
    } finally {
      setSendingAudio(false)
    }
  }

  const handleAudioCancel = () => {
    if (isRecording) cancel()
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
        {isRecording ? (
          <AudioRecorderBar
            duration={duration}
            levels={levels}
            onCancel={handleAudioCancel}
            onSend={handleAudioSend}
          />
        ) : (
          <form onSubmit={onSendMessage} className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach image"
              title="Send image — JPG / PNG / GIF / WEBP, max 2 MB after compression"
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

            {messageInput.trim() ? (
              <Button
                type="submit"
                variant="primary"
                size="md"
                aria-label="Send"
                className="!px-4 sm:!px-5 shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            ) : (
              <button
                type="button"
                onClick={handleMicClick}
                aria-label="Record voice message"
                title="Record voice message"
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-overlay text-text-muted transition-colors shrink-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0M12 19v3m-3 0h6M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z" />
                </svg>
              </button>
            )}
          </form>
        )}
      </div>
    </>
  )
}
