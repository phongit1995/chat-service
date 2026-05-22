import { app, ipcMain } from 'electron'
import { IPC } from './channels'

export function registerAppIpc() {
  ipcMain.handle(IPC.APP_VERSION, () => app.getVersion())
  ipcMain.handle(IPC.APP_PLATFORM, () => process.platform)
}
