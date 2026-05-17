import { FormEvent, useEffect, useRef, useState, lazy, Suspense, KeyboardEvent } from 'react'
import { Button } from '../../components/ui'
import { ChatHeader, MessageList } from '../../components/chat'
import type { Conversation, Message, User } from '../../types'
import type { TypingUserInfo } from '../../store/chat.types'

const EmojiPicker = lazy(() => import('emoji-picker-react'))

import { splitIntoSegments } from '../../utils/emoji'
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_IMAGE_MIMES_ACCEPT,
  HARD_UPLOAD_BYTES,
  isAllowedImageMime,
} from '../../utils/imageLimits'

// Lấy plain text từ contenteditable (giữ \n cho xuống dòng)
const getPlainText = (el: HTMLElement): string => {
  let text = ''
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ''
    } else if ((node as HTMLElement).tagName === 'BR') {
      text += '\n'
    } else if ((node as HTMLElement).tagName === 'DIV' || (node as HTMLElement).tagName === 'P') {
      if (text && !text.endsWith('\n')) text += '\n'
      text += getPlainText(node as HTMLElement)
    } else {
      text += (node as HTMLElement).textContent ?? ''
    }
  }
  return text
}

// Đặt cursor về cuối contenteditable
const moveCursorToEnd = (el: HTMLElement) => {
  const range = document.createRange()
  const sel = window.getSelection()
  range.selectNodeContents(el)
  range.collapse(false)
  sel?.removeAllRanges()
  sel?.addRange(range)
}

interface ChatAreaProps {
  conversation: Conversation
  messages: Message[]
  messageInput: string
  typingUsers: Map<string, TypingUserInfo>
  user: User | null
  onSetMessageInput: (value: string) => void
  onSendMessage: (e: FormEvent) => void
  onSendImage: (file: File, caption?: string) => Promise<void>
  onBack?: () => void
}

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
}: ChatAreaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null)

  const handleFileSelect = (file: File | null | undefined) => {
    if (!file) return
    if (!isAllowedImageMime(file.type)) {
      alert(`Định dạng không hỗ trợ: ${file.type || 'unknown'}. Chỉ chấp nhận ${ALLOWED_IMAGE_MIMES.map((m) => m.replace('image/', '').toUpperCase()).join(' / ')}.`)
      return
    }
    if (file.size > HARD_UPLOAD_BYTES) {
      alert(`Ảnh quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa ${HARD_UPLOAD_BYTES / 1024 / 1024}MB trước khi nén.`)
      return
    }
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl)
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) })
  }

  const clearPendingImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl)
    setPendingImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: FormEvent) => {
    if (pendingImage) {
      e.preventDefault()
      const file = pendingImage.file
      const caption = messageInput
      clearPendingImage()
      onSetMessageInput('')
      try {
        await onSendImage(file, caption)
      } catch (err) {
        console.error('send image failed', err)
      }
      return
    }
    onSendMessage(e)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          handleFileSelect(file)
          return
        }
      }
    }
  }
  const editableRef = useRef<HTMLDivElement>(null)
  const pickerWrapRef = useRef<HTMLDivElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Dùng ref để tránh re-render loop khi sync nội dung
  const isComposing = useRef(false)
  // Lưu vị trí cursor (char offset) trước khi focus rời đi (vd: click emoji picker)
  const savedCursorOffset = useRef<number | null>(null)

  // Sync messageInput → DOM khi state thay đổi từ bên ngoài (vd: sau khi gửi xong reset về "")
  useEffect(() => {
    const el = editableRef.current
    if (!el) return
    const current = getPlainText(el)
    if (current !== messageInput) {
      // Re-render nội dung với emoji lớn
      renderContent(el, messageInput)
      moveCursorToEnd(el)
    }
  }, [messageInput])

  const renderContent = (el: HTMLElement, text: string) => {
    el.innerHTML = ''
    if (!text) return
    const segments = splitIntoSegments(text)
    for (const seg of segments) {
      if (seg.isEmoji) {
        const span = document.createElement('span')
        span.style.fontSize = '1.5em'
        span.style.lineHeight = '1'
        span.style.verticalAlign = 'middle'
        span.style.display = 'inline-block'
        span.textContent = seg.text
        el.appendChild(span)
      } else {
        el.appendChild(document.createTextNode(seg.text))
      }
    }
  }

  const handleInput = () => {
    if (isComposing.current) return
    const el = editableRef.current
    if (!el) return
    const plain = getPlainText(el)
    onSetMessageInput(plain)
    // Re-render để emoji được style đúng
    const sel = window.getSelection()
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null
    // Lưu vị trí cursor (offset ký tự)
    let offset = 0
    if (range) {
      const preRange = document.createRange()
      preRange.selectNodeContents(el)
      preRange.setEnd(range.endContainer, range.endOffset)
      offset = preRange.toString().length
    }
    renderContent(el, plain)
    // Khôi phục cursor
    restoreCursor(el, offset)
  }

  const restoreCursor = (el: HTMLElement, charOffset: number) => {
    const sel = window.getSelection()
    if (!sel) return
    let remaining = charOffset
    const walk = (node: Node): boolean => {
      if (node.nodeType === Node.TEXT_NODE) {
        const len = (node.textContent ?? '').length
        if (remaining <= len) {
          const range = document.createRange()
          range.setStart(node, remaining)
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
          return true
        }
        remaining -= len
        return false
      }
      for (const child of Array.from(node.childNodes)) {
        if (walk(child)) return true
      }
      return false
    }
    if (!walk(el)) moveCursorToEnd(el)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const text = editableRef.current ? getPlainText(editableRef.current) : messageInput
      if (!text.trim() && !pendingImage) return
      handleSubmit(e as unknown as FormEvent)
    }
  }

  // Lưu cursor offset hiện tại (gọi trước khi focus rời đi)
  const saveCursorOffset = () => {
    const el = editableRef.current
    if (!el) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const pre = document.createRange()
    pre.selectNodeContents(el)
    pre.setEnd(range.endContainer, range.endOffset)
    savedCursorOffset.current = pre.toString().length
  }

  const insertEmoji = (emoji: string) => {
    const el = editableRef.current
    if (!el) {
      onSetMessageInput(messageInput + emoji)
      return
    }

    // Dùng vị trí đã lưu (trước khi click picker làm mất focus)
    const insertAt = savedCursorOffset.current ?? messageInput.length
    const currentText = messageInput
    const newText = currentText.slice(0, insertAt) + emoji + currentText.slice(insertAt)
    const newCursorOffset = insertAt + [...emoji].length // đếm theo grapheme

    onSetMessageInput(newText)
    renderContent(el, newText)
    el.focus()
    restoreCursor(el, newCursorOffset)
    savedCursorOffset.current = newCursorOffset
    setPickerOpen(false)
  }

  useEffect(() => {
    if (!pickerOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (pickerWrapRef.current && !pickerWrapRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [pickerOpen])

  return (
    <>
      <ChatHeader conversation={conversation} onBack={onBack} />
      <MessageList
        conversation={conversation}
        messages={messages}
        typingUsers={typingUsers}
        user={user}
      />

      <div
        className="border-t border-line-subtle bg-surface/95 backdrop-blur-sm px-3 sm:px-4 pt-3 sm:pt-4"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        {pendingImage && (
          <div className="mb-2 flex items-center gap-3 p-2 rounded-lg bg-surface-overlay">
            <img src={pendingImage.previewUrl} alt="" className="w-14 h-14 object-cover rounded-md flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate text-ink-primary">{pendingImage.file.name}</p>
              <p className="text-xs text-ink-tertiary">
                {(pendingImage.file.size / 1024 / 1024).toFixed(2)} MB · sẽ tự nén về ≤ 2 MB
              </p>
            </div>
            <button
              type="button"
              onClick={clearPendingImage}
              aria-label="Remove image"
              className="w-8 h-8 rounded-full flex items-center justify-center text-ink-tertiary hover:bg-surface/60 hover:text-ink-primary"
            >
              ✕
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_MIMES_ACCEPT}
          hidden
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
        />
        <form onSubmit={handleSubmit} className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach image"
            title="Gửi ảnh — JPG / PNG / GIF / WEBP, tối đa 2 MB sau khi nén"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-overlay transition-colors shrink-0"
          >
            <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          {/* contenteditable thay thế <input> để hỗ trợ emoji lớn inline */}
          <div
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onKeyUp={saveCursorOffset}
            onMouseUp={saveCursorOffset}
            onBlur={saveCursorOffset}
            onPaste={handlePaste}
            onCompositionStart={() => { isComposing.current = true }}
            onCompositionEnd={() => {
              isComposing.current = false
              handleInput()
            }}
            data-placeholder={pendingImage ? 'Add a caption…' : 'Type a message…'}
            className="message-input flex-1 min-w-0 min-h-[40px] max-h-[120px] overflow-y-auto cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-ink-tertiary empty:before:pointer-events-none"
            style={{ lineHeight: '1.5', wordBreak: 'break-word', outline: 'none', whiteSpace: 'pre-wrap' }}
          />

          <div ref={pickerWrapRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              aria-label="Insert emoji"
              className="w-10 h-10 rounded-full flex items-center justify-center text-2xl hover:bg-surface-overlay transition-colors"
            >
              <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {pickerOpen && (
              <div className="absolute bottom-12 right-0 z-50 shadow-2xl rounded-lg overflow-hidden">
                <Suspense fallback={<div className="w-[340px] h-[440px] bg-surface flex items-center justify-center text-text-muted">Loading…</div>}>
                  <EmojiPicker
                    onEmojiClick={(e) => insertEmoji(e.emoji)}
                    width={340}
                    height={440}
                    lazyLoadEmojis
                    emojiStyle={'native' as never}
                  />
                </Suspense>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={!pendingImage && !messageInput.trim()}
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
