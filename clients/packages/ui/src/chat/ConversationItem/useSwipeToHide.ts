import { useRef, useState, PointerEvent } from 'react'

const HIDE_THRESHOLD = 100

export const useSwipeToHide = (onHide?: () => void) => {
  const [offset, setOffset] = useState(0)
  const startX = useRef<number | null>(null)
  const dragging = useRef(false)
  const moved = useRef(false)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!onHide) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    startX.current = e.clientX
    dragging.current = true
    moved.current = false
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || startX.current === null) return
    const dx = e.clientX - startX.current
    if (Math.abs(dx) > 5) {
      if (!moved.current) {
        moved.current = true
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {}
      }
    }
    if (dx < 0) {
      setOffset(Math.max(dx, -180))
    } else if (offset < 0) {
      setOffset(0)
    }
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    if (moved.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
    }
    if (offset <= -HIDE_THRESHOLD && onHide) {
      setOffset(-400)
      setTimeout(onHide, 180)
    } else {
      setOffset(0)
    }
  }

  return {
    offset,
    dragging: dragging.current,
    moved: moved.current,
    willHide: offset <= -HIDE_THRESHOLD,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
