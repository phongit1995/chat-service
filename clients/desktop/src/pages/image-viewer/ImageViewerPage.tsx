import { useEffect, useMemo, useState } from 'react'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export const ImageViewerPage = () => {
  const { url, alt } = useMemo(() => {
    const hash = window.location.hash
    const queryStart = hash.indexOf('?')
    const params = new URLSearchParams(queryStart >= 0 ? hash.slice(queryStart + 1) : '')
    return { url: params.get('url') || '', alt: params.get('alt') || 'image' }
  }, [])

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    document.title = alt || 'Image'
  }, [alt])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.close()
      else if (e.key === '0') resetView()
      else if (e.key === '+' || e.key === '=') setScale((s) => clamp(s * 1.2, 0.1, 10))
      else if (e.key === '-' || e.key === '_') setScale((s) => clamp(s / 1.2, 0.1, 10))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const resetView = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.002
    setScale((s) => clamp(s * (1 + delta), 0.1, 10))
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return
    setDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y })
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart) return
    setOffset({ x: dragStart.ox + (e.clientX - dragStart.x), y: dragStart.oy + (e.clientY - dragStart.y) })
  }
  const onMouseUp = () => {
    setDragging(false)
    setDragStart(null)
  }

  const [saving, setSaving] = useState(false)
  const onSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      await window.desktop?.saveImage?.(url, alt)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-screen h-screen bg-black flex flex-col select-none overflow-hidden">
      <div
        className="h-9 flex-shrink-0 bg-black/80 backdrop-blur flex items-center justify-center text-white/80 text-xs"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="truncate max-w-[60%]">{alt}</span>
      </div>

      <div
        className="flex-1 min-h-0 flex items-center justify-center overflow-hidden"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={url}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: dragging ? 'none' : 'transform 120ms ease-out',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      </div>

      <div className="h-12 flex-shrink-0 bg-black/80 backdrop-blur flex items-center justify-center gap-2 text-white">
        <button
          type="button"
          onClick={() => setScale((s) => clamp(s / 1.2, 0.1, 10))}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          title="Zoom out (-)"
        >−</button>
        <button
          type="button"
          onClick={resetView}
          className="px-3 h-9 rounded-full bg-white/10 hover:bg-white/20 text-xs min-w-[64px]"
          title="Reset (0)"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          onClick={() => setScale((s) => clamp(s * 1.2, 0.1, 10))}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          title="Zoom in (+)"
        >+</button>
        <div className="w-px h-5 bg-white/20 mx-2" />
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-4 h-9 rounded-full bg-white/10 hover:bg-white/20 text-xs disabled:opacity-50"
          title="Save"
        >{saving ? 'Saving…' : 'Save'}</button>
        <button
          type="button"
          onClick={() => window.close()}
          className="px-4 h-9 rounded-full bg-white/10 hover:bg-white/20 text-xs"
          title="Close (Esc)"
        >Close</button>
      </div>
    </div>
  )
}
