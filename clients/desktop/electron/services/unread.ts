import { app, Tray } from 'electron'
import { store } from './store'

let tray: Tray | null = null

export const setTray = (t: Tray) => {
  tray = t
}

export function setUnread(count: number) {
  store.set('unread', count)
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setBadge(count > 0 ? String(count) : '')
  }
  tray?.setToolTip(count > 0 ? `Chat — ${count} unread` : 'Chat')
}
