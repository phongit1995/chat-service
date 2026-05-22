import { BrowserWindow, ipcMain } from 'electron'
import { IPC } from './channels'

export function registerWindowIpc() {
  ipcMain.handle(IPC.WINDOW_MINIMIZE, (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
  ipcMain.handle(IPC.WINDOW_MAXIMIZE, (e) => {
    const w = BrowserWindow.fromWebContents(e.sender)
    if (!w) return
    if (w.isMaximized()) w.unmaximize()
    else w.maximize()
  })
  ipcMain.handle(IPC.WINDOW_CLOSE, (e) => BrowserWindow.fromWebContents(e.sender)?.close())
}
