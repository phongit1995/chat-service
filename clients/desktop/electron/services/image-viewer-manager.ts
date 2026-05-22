import { BrowserWindow, shell } from 'electron'
import { isDev, preloadPath, rendererIndexPath } from './paths'

const viewers = new Map<string, BrowserWindow>()

export function closeAllImageViewers() {
  for (const win of viewers.values()) {
    if (!win.isDestroyed()) win.destroy()
  }
  viewers.clear()
}

export function openImageViewer(url: string, alt?: string) {
  if (!url) return
  const existing = viewers.get(url)
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore()
    existing.focus()
    return
  }

  const viewer = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 400,
    minHeight: 300,
    show: false,
    backgroundColor: '#000000',
    titleBarStyle: 'hidden',
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 12 } : undefined,
    frame: process.platform !== 'darwin' ? false : true,
    autoHideMenuBar: process.platform !== 'darwin',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const query = new URLSearchParams({ url, alt: alt || '' }).toString()
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    viewer.loadURL(`${process.env.ELECTRON_RENDERER_URL}/#/image-viewer?${query}`)
  } else {
    viewer.loadFile(rendererIndexPath, { hash: `/image-viewer?${query}` })
  }

  viewer.on('ready-to-show', () => viewer.show())
  viewer.on('closed', () => viewers.delete(url))

  viewer.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    shell.openExternal(openUrl)
    return { action: 'deny' }
  })

  viewers.set(url, viewer)
}
