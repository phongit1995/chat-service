import { registerAppIpc } from './app.ipc'
import { registerImageIpc } from './image.ipc'
import { registerNotificationIpc } from './notification.ipc'
import { registerShellIpc } from './shell.ipc'
import { registerWindowIpc } from './window.ipc'

export function registerIpcHandlers() {
  registerAppIpc()
  registerWindowIpc()
  registerShellIpc()
  registerNotificationIpc()
  registerImageIpc()
}
