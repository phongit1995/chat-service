import { app, BrowserWindow, ipcMain, shell, Notification, Tray, Menu, nativeImage } from 'electron'
import Store from 'electron-store'
import path from 'node:path'

const isDev = !app.isPackaged

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
}

const store = new Store<{ window: WindowState; unread: number }>({
  defaults: {
    window: { width: 1280, height: 800 },
    unread: 0,
  },
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function createWindow() {
  const saved = store.get('window')

  mainWindow = new BrowserWindow({
    width: saved.width,
    height: saved.height,
    x: saved.x,
    y: saved.y,
    minWidth: 960,
    minHeight: 600,
    show: false,
    icon: path.join(__dirname, '../../build/icon.png'),
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 10 } : undefined,
    frame: process.platform !== 'darwin' ? false : true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (saved.isMaximized) mainWindow.maximize()

  const persistBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const isMax = mainWindow.isMaximized()
    if (isMax) {
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
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

function createTray() {
  const iconPath = path.join(__dirname, '../../build/icon.png')
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 })
  if (process.platform === 'darwin') trayIcon.setTemplateImage(false)
  tray = new Tray(trayIcon)
  tray.setToolTip('Chat')

  const menu = Menu.buildFromTemplate([
    { label: 'Open Chat', click: () => showMainWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit() } },
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => showMainWindow())
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function setUnread(count: number) {
  store.set('unread', count)
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setBadge(count > 0 ? String(count) : '')
  }
  tray?.setToolTip(count > 0 ? `Chat — ${count} unread` : 'Chat')
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(path.join(__dirname, '../../build/icon.png'))
  }
  createWindow()
  createTray()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else showMainWindow()
  })
})

app.on('before-quit', () => { isQuitting = true })
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('app:version', () => app.getVersion())
ipcMain.handle('app:platform', () => process.platform)
ipcMain.handle('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
ipcMain.handle('window:maximize', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender)
  if (!w) return
  if (w.isMaximized()) w.unmaximize()
  else w.maximize()
})
ipcMain.handle('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
ipcMain.handle('shell:openExternal', (_e, url: string) => shell.openExternal(url))
ipcMain.handle('notification:show', (_e, title: string, body: string) => {
  if (!Notification.isSupported()) return
  const iconPath = path.join(__dirname, '../../build/icon.png')
  const n = new Notification({ title, body, icon: iconPath, silent: false })
  n.on('click', () => showMainWindow())
  n.show()
})

ipcMain.handle('badge:set', (_e, count: number) => setUnread(count))
