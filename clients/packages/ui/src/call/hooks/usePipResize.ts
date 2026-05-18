import { useCallback, useEffect, useRef, type RefObject } from 'react'

export type ResizeDir = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'

interface UsePipResizeOptions {
  nodeRef: RefObject<HTMLDivElement | null>
  width: number
  minWidth: number
  maxWidth: number
  aspect: number
  onCommit: (width: number) => void
}

export interface PipResizeHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void
}

export function usePipResize({
  nodeRef,
  width,
  minWidth,
  maxWidth,
  aspect,
  onCommit,
}: UsePipResizeOptions) {
  const resizing = useRef(false)
  const resizeDir = useRef<ResizeDir>('se')
  const start = useRef({ x: 0, y: 0, w: 0 })
  const liveWidth = useRef(width)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    liveWidth.current = width
    const node = nodeRef.current
    if (node && !resizing.current) {
      node.style.width = `${width}px`
      node.style.height = `${width * aspect}px`
    }
  }, [width, aspect, nodeRef])

  useEffect(() => () => {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current)
  }, [])

  const makeHandlers = useCallback((dir: ResizeDir): PipResizeHandlers => ({
    onPointerDown: (e) => {
      e.stopPropagation()
      resizing.current = true
      resizeDir.current = dir
      start.current = { x: e.clientX, y: e.clientY, w: liveWidth.current }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    onPointerMove: (e) => {
      if (!resizing.current) return
      e.stopPropagation()
      const dx = e.clientX - start.current.x
      const dy = e.clientY - start.current.y
      const d = resizeDir.current
      const sx = d.includes('e') ? dx : d.includes('w') ? -dx : 0
      const sy = d.includes('s') ? dy : d.includes('n') ? -dy : 0
      const delta = Math.abs(sx) > Math.abs(sy) ? sx : sy
      const next = Math.max(minWidth, Math.min(maxWidth, start.current.w + delta))
      liveWidth.current = next
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          rafId.current = null
          const node = nodeRef.current
          if (!node) return
          node.style.width = `${liveWidth.current}px`
          node.style.height = `${liveWidth.current * aspect}px`
        })
      }
    },
    onPointerUp: (e) => {
      if (!resizing.current) return
      resizing.current = false
      e.stopPropagation()
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
      onCommit(liveWidth.current)
    },
    onPointerCancel: (e) => {
      if (!resizing.current) return
      resizing.current = false
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
    },
  }), [nodeRef, minWidth, maxWidth, aspect, onCommit])

  return { makeHandlers }
}
