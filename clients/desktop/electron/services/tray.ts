import { app, Menu, nativeImage, Tray } from 'electron'
import { iconPath } from './paths'
import { setTray } from './unread'
import { setQuitting, showMainWindow } from './window-manager'

export function createTray() {
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 })
  if (process.platform === 'darwin') trayIcon.setTemplateImage(false)

  const tray = new Tray(trayIcon)
  tray.setToolTip('Chat')

  const menu = Menu.buildFromTemplate([
    { label: 'Open Chat', click: () => showMainWindow() },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        setQuitting(true)
        app.quit()
      },
    },
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => showMainWindow())

  setTray(tray)
  return tray
}
