import { BrowserWindow, shell } from 'electron'
import { iconPath, isDev, preloadPath, rendererIndexPath } from './paths'
import { store } from './store'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

export const getMainWindow = () => mainWindow
export const setQuitting = (v: boolean) => {
  isQuitting = v
}

export function createMainWindow() {
  const saved = store.get('window')

  mainWindow = new BrowserWindow({
    width: saved.width,
    height: saved.height,
    x: saved.x,
    y: saved.y,
    minWidth: 960,
    minHeight: 600,
    show: false,
    icon: iconPath,
    autoHideMenuBar: process.platform !== 'darwin',
    titleBarStyle: 'hidden',
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 10 } : undefined,
    frame: process.platform !== 'darwin' ? false : true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (saved.isMaximized) mainWindow.maximize()

  const persistBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (mainWindow.isMaximized()) {
      store.set('window', { ...store.get('window'), isMaximized: true })
    } else {
      const b = mainWindow.getBounds()
      store.set('window', { width: b.width, height: b.height, x: b.x, y: b.y, isMaximized: false })
    }
  }
  mainWindow.on('resize', persistBounds)
  mainWindow.on('move', persistBounds)
  mainWindow.on('maximize', persistBounds)
  mainWindow.on('unmaximize', persistBounds)

  mainWindow.on('close', (e) => {
    if (!isQuitting && process.platform === 'darwin') {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(rendererIndexPath)
  }

  return mainWindow
}

export function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}
