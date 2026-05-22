import { ipcMain, shell } from 'electron'
import { IPC } from './channels'

export function registerShellIpc() {
  ipcMain.handle(IPC.SHELL_OPEN_EXTERNAL, (_e, url: string) => shell.openExternal(url))
}
