import { HARD_UPLOAD_BYTES } from '@chat/shared'

export const DragOverlay = () => (
  <div className="fixed inset-0 z-50 bg-primary-500/10 backdrop-blur-sm border-4 border-dashed border-primary-500 flex items-center justify-center pointer-events-none">
    <div className="bg-surface rounded-2xl shadow-soft-lg px-8 py-6 flex flex-col items-center gap-3">
      <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
        />
      </svg>
      <p className="text-base font-semibold text-ink-primary">Drop image to send</p>
      <p className="text-xs text-ink-tertiary">
        JPG / PNG / GIF / WEBP — max {HARD_UPLOAD_BYTES / 1024 / 1024}MB
      </p>
    </div>
  </div>
)
