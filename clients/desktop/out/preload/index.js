"use strict";
const electron = require("electron");
const api = {
  getVersion: () => electron.ipcRenderer.invoke("app:version"),
  getPlatform: () => electron.ipcRenderer.invoke("app:platform"),
  openExternal: (url) => electron.ipcRenderer.invoke("shell:openExternal", url),
  showNotification: (title, body) => electron.ipcRenderer.invoke("notification:show", title, body)
};
electron.contextBridge.exposeInMainWorld("desktop", api);
