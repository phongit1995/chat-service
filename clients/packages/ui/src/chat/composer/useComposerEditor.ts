import { useEffect, useRef, KeyboardEvent, FormEvent } from 'react'
import {
  getCursorOffset,
  getPlainText,
  moveCursorToEnd,
  renderContent,
  restoreCursor,
} from './contentEditable.utils'

interface UseComposerEditorOptions {
  messageInput: string
  onSetMessageInput: (value: string) => void
  onSendMessage: (e: FormEvent) => void
}

export const useComposerEditor = ({
  messageInput,
  onSetMessageInput,
  onSendMessage,
}: UseComposerEditorOptions) => {
  const editableRef = useRef<HTMLDivElement>(null)
  const isComposing = useRef(false)
  const savedCursorOffset = useRef<number | null>(null)

  useEffect(() => {
    const el = editableRef.current
    if (!el) return
    const current = getPlainText(el)
    if (current !== messageInput) {
      renderContent(el, messageInput)
      moveCursorToEnd(el)
    }
  }, [messageInput])

  const handleInput = () => {
    if (isComposing.current) return
    const el = editableRef.current
    if (!el) return
    const plain = getPlainText(el)
    onSetMessageInput(plain)
    const offset = getCursorOffset(el)
    renderContent(el, plain)
    restoreCursor(el, offset)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const text = editableRef.current ? getPlainText(editableRef.current) : messageInput
      if (!text.trim()) return
      onSendMessage(e as unknown as FormEvent)
    }
  }

  const saveCursorOffset = () => {
    const el = editableRef.current
    if (!el) return
    savedCursorOffset.current = getCursorOffset(el)
  }

  const insertEmoji = (emoji: string) => {
    const el = editableRef.current
    const piece = `${emoji} `

    if (!el) {
      onSetMessageInput(messageInput + piece)
      return
    }

    const insertAt = savedCursorOffset.current ?? messageInput.length
    const newText = messageInput.slice(0, insertAt) + piece + messageInput.slice(insertAt)
    const newCursorOffset = insertAt + piece.length

    onSetMessageInput(newText)
    renderContent(el, newText)
    el.focus()
    restoreCursor(el, newCursorOffset)
    savedCursorOffset.current = newCursorOffset
  }

  const composerEvents = {
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    onKeyUp: saveCursorOffset,
    onMouseUp: saveCursorOffset,
    onBlur: saveCursorOffset,
    onCompositionStart: () => {
      isComposing.current = true
    },
    onCompositionEnd: () => {
      isComposing.current = false
      handleInput()
    },
  }

  return {
    editableRef,
    insertEmoji,
    composerEvents,
  }
}
