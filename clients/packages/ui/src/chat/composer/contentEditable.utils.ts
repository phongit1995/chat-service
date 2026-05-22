import { splitIntoSegments } from '@chat/shared'

export const getPlainText = (el: HTMLElement): string => {
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

export const moveCursorToEnd = (el: HTMLElement) => {
  const range = document.createRange()
  const sel = window.getSelection()
  range.selectNodeContents(el)
  range.collapse(false)
  sel?.removeAllRanges()
  sel?.addRange(range)
}

export const renderContent = (el: HTMLElement, text: string) => {
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

export const restoreCursor = (el: HTMLElement, charOffset: number) => {
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

export const getCursorOffset = (el: HTMLElement): number => {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return 0
  const range = sel.getRangeAt(0)
  const pre = document.createRange()
  pre.selectNodeContents(el)
  pre.setEnd(range.endContainer, range.endOffset)
  return pre.toString().length
}
