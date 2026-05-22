export interface DesktopBridge {
  openImageViewer?: (url: string, alt?: string) => void
  saveImage?: (url: string, suggestedName?: string) => Promise<{ saved: boolean; path?: string; error?: string }>
  showNotification?: (title: string, body: string) => void
  setBadge?: (count: number) => void
}

export const getDesktopBridge = (): DesktopBridge | undefined => {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { desktop?: DesktopBridge }).desktop
}
