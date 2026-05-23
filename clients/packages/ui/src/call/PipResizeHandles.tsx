import type { PipResizeHandlers, ResizeDir } from './hooks/usePipResize'

interface PipResizeHandlesProps {
  makeHandlers: (dir: ResizeDir) => PipResizeHandlers
}

const CORNER_SIZE = 'w-3.5 h-3.5'
const EDGE_THICKNESS_H = 'h-1.5'
const EDGE_THICKNESS_V = 'w-1.5'
const EDGE_INSET = 'left-3.5 right-3.5'
const EDGE_INSET_V = 'top-3.5 bottom-3.5'

const HANDLE_STYLE = { touchAction: 'none' as const }

export const PipResizeHandles = ({ makeHandlers }: PipResizeHandlesProps) => (
  <>
    <div {...makeHandlers('nw')} role="separator" aria-label="Resize top-left" title="Resize" className={`absolute top-0 left-0 ${CORNER_SIZE} cursor-nwse-resize z-10`} style={HANDLE_STYLE} />
    <div {...makeHandlers('ne')} role="separator" aria-label="Resize top-right" title="Resize" className={`absolute top-0 right-0 ${CORNER_SIZE} cursor-nesw-resize z-10`} style={HANDLE_STYLE} />
    <div {...makeHandlers('sw')} role="separator" aria-label="Resize bottom-left" title="Resize" className={`absolute bottom-0 left-0 ${CORNER_SIZE} cursor-nesw-resize z-10`} style={HANDLE_STYLE} />
    <div {...makeHandlers('se')} role="separator" aria-label="Resize bottom-right" title="Resize" className={`absolute bottom-0 right-0 ${CORNER_SIZE} cursor-nwse-resize z-10`} style={HANDLE_STYLE} />
    <div {...makeHandlers('n')} role="separator" aria-label="Resize top" title="Resize" className={`absolute top-0 ${EDGE_INSET} ${EDGE_THICKNESS_H} cursor-ns-resize z-10`} style={HANDLE_STYLE} />
    <div {...makeHandlers('s')} role="separator" aria-label="Resize bottom" title="Resize" className={`absolute bottom-0 ${EDGE_INSET} ${EDGE_THICKNESS_H} cursor-ns-resize z-10`} style={HANDLE_STYLE} />
    <div {...makeHandlers('w')} role="separator" aria-label="Resize left" title="Resize" className={`absolute left-0 ${EDGE_INSET_V} ${EDGE_THICKNESS_V} cursor-ew-resize z-10`} style={HANDLE_STYLE} />
    <div {...makeHandlers('e')} role="separator" aria-label="Resize right" title="Resize" className={`absolute right-0 ${EDGE_INSET_V} ${EDGE_THICKNESS_V} cursor-ew-resize z-10`} style={HANDLE_STYLE} />
    <div className="absolute bottom-1 right-1 w-3 h-3 pointer-events-none opacity-70">
      <svg viewBox="0 0 12 12" className="w-full h-full text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" fill="currentColor">
        <circle cx="10" cy="10" r="1" />
        <circle cx="6" cy="10" r="1" />
        <circle cx="10" cy="6" r="1" />
      </svg>
    </div>
  </>
)
