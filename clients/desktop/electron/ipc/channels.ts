export const IPC = {
  APP_VERSION: 'app:version',
  APP_PLATFORM: 'app:platform',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  SHELL_OPEN_EXTERNAL: 'shell:openExternal',
  NOTIFICATION_SHOW: 'notification:show',
  BADGE_SET: 'badge:set',
  IMAGE_OPEN: 'image:open',
  IMAGE_SAVE: 'image:save',
  DIALOG_OPEN_IMAGE: 'dialog:openImage',
  MENU_NEW_CHAT: 'menu:new-chat',
  MENU_SEARCH: 'menu:search',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
