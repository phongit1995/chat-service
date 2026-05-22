import Store from 'electron-store'

export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
}

interface AppStore {
  window: WindowState
  unread: number
}

export const store = new Store<AppStore>({
  defaults: {
    window: { width: 1280, height: 800 },
    unread: 0,
  },
})
