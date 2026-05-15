import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

export interface Position {
  x: number
  y: number
}

interface UseDraggableOptions {
  /** Initial offset from right edge in px. Used only if initialLeft is omitted. */
  initialRight?: number
  /** Initial offset from left edge in px. Overrides initialRight. */
  initialLeft?: number
  /** Initial offset from bottom edge in px. Used only if initialTop is omitted. */
  initialBottom?: number
  /** Initial offset from top edge in px. Overrides initialBottom. */
  initialTop?: number
  /** Controlled position. If null, hook places element at the initial corner. */
  position: Position | null
  /** Called whenever the position changes (drag or auto-clamp on resize). */
  onChange: (pos: Position) => void
}

const MARGIN = 12

/**
 * Makes a fixed-position element freely draggable. Position is CONTROLLED:
 * pass `position` + `onChange` from the parent (typically a store) so the
 * position survives unmount/remount cycles (e.g. minimize/expand).
 */
export function useDraggable({
  initialRight = 24,
  initialLeft,
  initialBottom = 24,
  initialTop,
  position,
  onChange,
}: UseDraggableOptions) {
  const dragging = useRef(false)
  const startMouse = useRef({ x: 0, y: 0 })
  const startPos = useRef({ x: 0, y: 0 })
  const nodeRef = useRef<HTMLDivElement | null>(null)

  const clamp = useCallback((x: number, y: number, w: number, h: number) => {
    const maxX = Math.max(MARGIN, window.innerWidth - w - MARGIN)
    const maxY = Math.max(MARGIN, window.innerHeight - h - MARGIN)
    return {
      x: Math.max(MARGIN, Math.min(maxX, x)),
      y: Math.max(MARGIN, Math.min(maxY, y)),
    }
  }, [])

  const resolveInitial = useCallback(() => {
    const node = nodeRef.current
    const w = node?.offsetWidth ?? 320
    const h = node?.offsetHeight ?? 240
    const x = initialLeft !== undefined
      ? initialLeft
      : window.innerWidth - w - initialRight
    const y = initialTop !== undefined
      ? initialTop
      : window.innerHeight - h - initialBottom
    return clamp(x, y, w, h)
  }, [initialLeft, initialRight, initialTop, initialBottom, clamp])

  // If no position yet, compute one from the initial corner after mount.
  useLayoutEffect(() => {
    if (position === null) {
      onChange(resolveInitial())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position === null])

  // Keep within viewport on resize.
  useEffect(() => {
    const onResize = () => {
      if (dragging.current || !position) return
      const node = nodeRef.current
      const w = node?.offsetWidth ?? 320
      const h = node?.offsetHeight ?? 240
      const clamped = clamp(position.x, position.y, w, h)
      if (clamped.x !== position.x || clamped.y !== position.y) {
        onChange(clamped)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clamp, position, onChange])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!position) return
    dragging.current = true
    startMouse.current = { x: e.clientX, y: e.clientY }
    startPos.current = { ...position }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [position])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const dx = e.clientX - startMouse.current.x
    const dy = e.clientY - startMouse.current.y
    const node = nodeRef.current
    const w = node?.offsetWidth ?? 320
    const h = node?.offsetHeight ?? 240
    onChange(clamp(startPos.current.x + dx, startPos.current.y + dy, w, h))
  }, [clamp, onChange])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  const dragStyle: React.CSSProperties = position
    ? { position: 'fixed', left: position.x, top: position.y }
    : {
        // Pre-mount: render off-screen until useLayoutEffect runs.
        position: 'fixed',
        visibility: 'hidden',
        left: -9999,
        top: -9999,
      }

  return { dragStyle, dragHandleProps: { onPointerDown, onPointerMove, onPointerUp }, nodeRef }
}
