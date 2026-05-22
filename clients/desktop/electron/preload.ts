import { contextBridge, ipcRenderer } from 'electron'

export interface PickedImage {
  name: string
  size: number
  data: ArrayBuffer
}

const api = {
  getVersion: () => ipcRenderer.invoke('app:version') as Promise<string>,
  getPlatform: () => ipcRenderer.invoke('app:platform') as Promise<NodeJS.Platform>,
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('notification:show', title, body),
  setBadge: (count: number) => ipcRenderer.invoke('badge:set', count),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  pickImage: () => ipcRenderer.invoke('dialog:openImage') as Promise<PickedImage | null>,
  openImageViewer: (url: string, alt?: string) =>
    ipcRenderer.invoke('image:open', { url, alt }),
  saveImage: (url: string, suggestedName?: string) =>
    ipcRenderer.invoke('image:save', { url, suggestedName }) as Promise<{ saved: boolean; path?: string }>,
  onMenuCommand: (handler: (command: 'new-chat' | 'search') => void) => {
    const listener = (_e: unknown, command: 'new-chat' | 'search') => handler(command)
    ipcRenderer.on('menu:new-chat', () => listener(null, 'new-chat'))
    ipcRenderer.on('menu:search', () => listener(null, 'search'))
    return () => {
      ipcRenderer.removeAllListeners('menu:new-chat')
      ipcRenderer.removeAllListeners('menu:search')
    }
  },
}

contextBridge.exposeInMainWorld('desktop', api)

export type DesktopApi = typeof api
