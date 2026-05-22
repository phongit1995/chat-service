import { ipcMain, Notification } from 'electron'
import { IPC } from './channels'
import { iconPath } from '../services/paths'
import { setUnread } from '../services/unread'
import { showMainWindow } from '../services/window-manager'

export function registerNotificationIpc() {
  ipcMain.handle(IPC.NOTIFICATION_SHOW, (_e, title: string, body: string) => {
    if (!Notification.isSupported()) return
    const n = new Notification({ title, body, icon: iconPath, silent: false })
    n.on('click', () => showMainWindow())
    n.show()
  })

  ipcMain.handle(IPC.BADGE_SET, (_e, count: number) => setUnread(count))
}
