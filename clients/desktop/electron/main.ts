import { app, BrowserWindow, dialog, ipcMain, shell, Notification, Tray, Menu, nativeImage, net } from 'electron'
import Store from 'electron-store'
import { readFile, writeFile } from 'node:fs/promises'
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
    autoHideMenuBar: process.platform !== 'darwin',
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

function buildAppMenu() {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            { role: 'services' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const },
          ],
        }]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new-chat'),
        },
        {
          label: 'Search',
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow?.webContents.send('menu:search'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const },
            ]),
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: () => shell.openExternal('https://github.com/phongit1995/chat-service'),
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
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
  buildAppMenu()
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

ipcMain.handle('image:save', async (e, payload: { url: string; suggestedName?: string }) => {
  const w = BrowserWindow.fromWebContents(e.sender)
  const fallbackName = (() => {
    try {
      const u = new URL(payload.url)
      return path.basename(u.pathname) || 'image.png'
    } catch {
      return 'image.png'
    }
  })()
  const defaultName = payload.suggestedName?.trim() || fallbackName

  const result = await dialog.showSaveDialog(w!, {
    title: 'Save image',
    defaultPath: defaultName,
  })
  if (result.canceled || !result.filePath) return { saved: false }

  const buffer = await new Promise<Uint8Array>((resolve, reject) => {
    const req = net.request(payload.url)
    const chunks: Uint8Array[] = []
    req.on('response', (res) => {
      res.on('data', (c: Buffer) => chunks.push(new Uint8Array(c.buffer, c.byteOffset, c.byteLength)))
      res.on('end', () => {
        const total = chunks.reduce((n, c) => n + c.byteLength, 0)
        const out = new Uint8Array(total)
        let offset = 0
        for (const c of chunks) {
          out.set(c, offset)
          offset += c.byteLength
        }
        resolve(out)
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })

  await writeFile(result.filePath, buffer)
  return { saved: true, path: result.filePath }
})

const imageViewers = new Map<string, BrowserWindow>()

ipcMain.handle('image:open', (_e, payload: { url: string; alt?: string }) => {
  const key = payload.url
  const existing = imageViewers.get(key)
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
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const query = new URLSearchParams({ url: payload.url, alt: payload.alt || '' }).toString()
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    viewer.loadURL(`${process.env.ELECTRON_RENDERER_URL}/#/image-viewer?${query}`)
  } else {
    viewer.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: `/image-viewer?${query}`,
    })
  }

  viewer.on('ready-to-show', () => viewer.show())
  viewer.on('closed', () => imageViewers.delete(key))

  viewer.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  imageViewers.set(key, viewer)
})

ipcMain.handle('dialog:openImage', async (e) => {
  const w = BrowserWindow.fromWebContents(e.sender)
  const result = await dialog.showOpenDialog(w!, {
    title: 'Select image',
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
    ],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const data = await readFile(filePath)
  return {
    name: path.basename(filePath),
    size: data.byteLength,
    data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  }
})
