import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from './ipc/channels'

export interface PickedImage {
  name: string
  size: number
  data: ArrayBuffer
}

export interface SaveImageResult {
  saved: boolean
  path?: string
  error?: string
}

type MenuCommand = 'new-chat' | 'search'

const api = {
  getVersion: () => ipcRenderer.invoke(IPC.APP_VERSION) as Promise<string>,
  getPlatform: () => ipcRenderer.invoke(IPC.APP_PLATFORM) as Promise<NodeJS.Platform>,
  openExternal: (url: string) => ipcRenderer.invoke(IPC.SHELL_OPEN_EXTERNAL, url),
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke(IPC.NOTIFICATION_SHOW, title, body),
  setBadge: (count: number) => ipcRenderer.invoke(IPC.BADGE_SET, count),
  minimize: () => ipcRenderer.invoke(IPC.WINDOW_MINIMIZE),
  maximize: () => ipcRenderer.invoke(IPC.WINDOW_MAXIMIZE),
  close: () => ipcRenderer.invoke(IPC.WINDOW_CLOSE),
  pickImage: () => ipcRenderer.invoke(IPC.DIALOG_OPEN_IMAGE) as Promise<PickedImage | null>,
  openImageViewer: (url: string, alt?: string) =>
    ipcRenderer.invoke(IPC.IMAGE_OPEN, { url, alt }),
  saveImage: (url: string, suggestedName?: string) =>
    ipcRenderer.invoke(IPC.IMAGE_SAVE, { url, suggestedName }) as Promise<SaveImageResult>,
  onMenuCommand: (handler: (command: MenuCommand) => void) => {
    const newChatListener = () => handler('new-chat')
    const searchListener = () => handler('search')
    ipcRenderer.on(IPC.MENU_NEW_CHAT, newChatListener)
    ipcRenderer.on(IPC.MENU_SEARCH, searchListener)
    return () => {
      ipcRenderer.removeListener(IPC.MENU_NEW_CHAT, newChatListener)
      ipcRenderer.removeListener(IPC.MENU_SEARCH, searchListener)
    }
  },
}

contextBridge.exposeInMainWorld('desktop', api)

export type DesktopApi = typeof api
