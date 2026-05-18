import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getVersion: () => ipcRenderer.invoke('app:version') as Promise<string>,
  getPlatform: () => ipcRenderer.invoke('app:platform') as Promise<NodeJS.Platform>,
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('notification:show', title, body),
}

contextBridge.exposeInMainWorld('desktop', api)

export type DesktopApi = typeof api
