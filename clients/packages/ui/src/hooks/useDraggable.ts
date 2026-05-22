import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

export interface Position {
  x: number
  y: number
}

interface UseDraggableOptions {
  initialRight?: number
  initialLeft?: number
  initialBottom?: number
  initialTop?: number
  position: Position | null
  onChange: (pos: Position) => void
}

const MARGIN = 12

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
  const livePos = useRef<Position>({ x: 0, y: 0 })
  const rafId = useRef<number | null>(null)
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const positionRef = useRef<Position | null>(position)
  const onChangeRef = useRef(onChange)
  positionRef.current = position
  onChangeRef.current = onChange

  const clamp = useCallback((x: number, y: number, w: number, h: number) => {
    const maxX = Math.max(MARGIN, window.innerWidth - w - MARGIN)
    const maxY = Math.max(MARGIN, window.innerHeight - h - MARGIN)
    return {
      x: Math.max(MARGIN, Math.min(maxX, x)),
      y: Math.max(MARGIN, Math.min(maxY, y)),
    }
  }, [])

  const applyTransform = useCallback((x: number, y: number) => {
    const node = nodeRef.current
    if (!node) return
    node.style.transform = `translate3d(${x}px, ${y}px, 0)`
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

  useLayoutEffect(() => {
    if (position === null) {
      onChange(resolveInitial())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position === null])

  useLayoutEffect(() => {
    if (!position) return
    livePos.current = position
    if (!dragging.current) applyTransform(position.x, position.y)
  }, [position, applyTransform])

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

  const moveHandlerRef = useRef<(e: PointerEvent) => void>(() => {})
  const upHandlerRef = useRef<() => void>(() => {})

  moveHandlerRef.current = (e: PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - startMouse.current.x
    const dy = e.clientY - startMouse.current.y
    const node = nodeRef.current
    const w = node?.offsetWidth ?? 320
    const h = node?.offsetHeight ?? 240
    const next = clamp(startPos.current.x + dx, startPos.current.y + dy, w, h)
    livePos.current = next
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null
        applyTransform(livePos.current.x, livePos.current.y)
      })
    }
  }

  upHandlerRef.current = () => {
    if (!dragging.current) return
    dragging.current = false
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current)
      rafId.current = null
    }
    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', onWindowPointerUp)
    window.removeEventListener('pointercancel', onWindowPointerUp)
    onChangeRef.current(livePos.current)
  }

  const onWindowPointerMove = useCallback((e: PointerEvent) => moveHandlerRef.current(e), [])
  const onWindowPointerUp = useCallback(() => upHandlerRef.current(), [])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const pos = positionRef.current
    if (!pos) return
    if (e.button !== undefined && e.button !== 0) return
    dragging.current = true
    startMouse.current = { x: e.clientX, y: e.clientY }
    startPos.current = { ...pos }
    livePos.current = { ...pos }
    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('pointercancel', onWindowPointerUp)
    e.preventDefault()
  }, [onWindowPointerMove, onWindowPointerUp])

  useEffect(() => () => {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', onWindowPointerUp)
    window.removeEventListener('pointercancel', onWindowPointerUp)
  }, [onWindowPointerMove, onWindowPointerUp])

  const dragStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: 0,
        top: 0,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        willChange: 'transform',
        touchAction: 'none',
      }
    : {
        position: 'fixed',
        visibility: 'hidden',
        left: -9999,
        top: -9999,
      }

  return { dragStyle, dragHandleProps: { onPointerDown }, nodeRef }
}
