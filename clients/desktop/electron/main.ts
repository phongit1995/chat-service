import { app, BrowserWindow } from 'electron'
import { registerIpcHandlers } from './ipc'
import { iconPath } from './services/paths'
import { buildAppMenu } from './services/menu'
import { createTray } from './services/tray'
import { createMainWindow, setQuitting, showMainWindow } from './services/window-manager'
import { closeAllImageViewers } from './services/image-viewer-manager'

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => showMainWindow())
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(iconPath)
  }
  createMainWindow()
  buildAppMenu()
  createTray()
  registerIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    else showMainWindow()
  })
})

app.on('before-quit', () => {
  setQuitting(true)
  closeAllImageViewers()
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
