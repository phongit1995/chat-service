import { ClipboardEvent } from 'react'

export const useImagePaste = (onFile: (file: File) => void) => {
  return (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          onFile(file)
          return
        }
      }
    }
  }
}
