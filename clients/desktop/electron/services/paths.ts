import { app } from 'electron'
import path from 'node:path'

export const isDev = !app.isPackaged

export const iconPath = path.join(__dirname, '../../build/icon.png')
export const preloadPath = path.join(__dirname, '../preload/index.js')
export const rendererIndexPath = path.join(__dirname, '../renderer/index.html')
