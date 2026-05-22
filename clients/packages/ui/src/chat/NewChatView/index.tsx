import { FormEvent, useEffect, useRef, KeyboardEvent } from 'react'
import { Avatar } from '../../common/Avatar'
import { Button } from '../../common/Button'
import {
  getPlainText,
  moveCursorToEnd,
  renderContent,
  getCursorOffset,
  restoreCursor,
} from '../composer/contentEditable.utils'
import type { NewChatViewProps } from './NewChatView.types'

export type { NewChatViewProps } from './NewChatView.types'

export const NewChatView = ({
  tempChatUser,
  messageInput,
  isCreatingConversation,
  onMessageChange,
  onSendMessage,
  onBack,
}: NewChatViewProps) => {
  const editableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = editableRef.current
    if (!el) return
    if (getPlainText(el) !== messageInput) {
      renderContent(el, messageInput)
      if (messageInput) moveCursorToEnd(el)
    }
  }, [messageInput])

  const handleInput = () => {
    const el = editableRef.current
    if (!el) return
    const plain = getPlainText(el)
    onMessageChange(plain)
    const offset = getCursorOffset(el)
    renderContent(el, plain)
    restoreCursor(el, offset)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!messageInput.trim() || isCreatingConversation) return
      onSendMessage(e as unknown as FormEvent)
    }
  }

  return (
    <>
      <div className="bg-surface/90 backdrop-blur-sm border-b border-line-subtle px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-2 hover:bg-surface-overlay rounded-full" aria-label="Back">
            <svg className="w-5 h-5 text-ink-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h2 className="text-base sm:text-lg font-semibold text-ink-primary truncate">
          New chat with {tempChatUser.fullName || tempChatUser.username}
        </h2>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <div className="text-center px-4 animate-fadeIn">
          <Avatar name={tempChatUser.username || tempChatUser.fullName || ''} size="xl" className="mx-auto mb-4" />
          <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
            {tempChatUser.fullName || tempChatUser.username}
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6">Send a message to start chatting</p>
        </div>
      </div>

      <div
        className="border-t backdrop-blur-sm bg-white/95 px-3 sm:px-4 pt-3 sm:pt-4 shadow-lg"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            ref={editableRef}
            contentEditable={!isCreatingConversation}
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder="Type your first message..."
            className="flex-1 min-w-0 min-h-[42px] max-h-[120px] overflow-y-auto px-4 sm:px-5 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
            style={{ lineHeight: '1.5', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
          />
          <Button
            type="button"
            onClick={(e) => onSendMessage(e as unknown as FormEvent)}
            disabled={!messageInput.trim() || isCreatingConversation}
            isLoading={isCreatingConversation}
            className="rounded-xl px-5 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-md hover:shadow-lg hover:scale-105 active:scale-95 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>
      </div>
    </>
  )
}
