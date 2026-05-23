import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

export const isDev = !app.isPackaged

const rawIconPath = path.join(__dirname, '../../build/icon.png')
export const iconPath = fs.existsSync(rawIconPath) ? rawIconPath : undefined
export const preloadPath = path.join(__dirname, '../preload/index.js')
export const rendererIndexPath = path.join(__dirname, '../renderer/index.html')
