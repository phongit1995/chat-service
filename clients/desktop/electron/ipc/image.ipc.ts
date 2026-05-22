import { BrowserWindow, dialog, ipcMain, net } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { IPC } from './channels'
import { openImageViewer } from '../services/image-viewer-manager'

interface SaveImagePayload {
  url: string
  suggestedName?: string
}

interface OpenImagePayload {
  url: string
  alt?: string
}

function fetchToBuffer(url: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const req = net.request(url)
    const chunks: Uint8Array[] = []
    req.on('response', (res) => {
      res.on('data', (c: Buffer) =>
        chunks.push(new Uint8Array(c.buffer, c.byteOffset, c.byteLength)),
      )
      res.on('end', () => {
        const total = chunks.reduce((n, c) => n + c.byteLength, 0)
        const out = new Uint8Array(total)
        let offset = 0
        for (const c of chunks) {
          out.set(c, offset)
          offset += c.byteLength
        }
        resolve(out)
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}

function defaultFileNameFor(url: string, suggested?: string) {
  if (suggested?.trim()) return suggested.trim()
  try {
    return path.basename(new URL(url).pathname) || 'image.png'
  } catch {
    return 'image.png'
  }
}

export function registerImageIpc() {
  ipcMain.handle(IPC.IMAGE_OPEN, (_e, payload: OpenImagePayload) =>
    openImageViewer(payload.url, payload.alt),
  )

  ipcMain.handle(IPC.IMAGE_SAVE, async (e, payload: SaveImagePayload) => {
    const w = BrowserWindow.fromWebContents(e.sender)
    const defaultPath = defaultFileNameFor(payload.url, payload.suggestedName)

    const result = await dialog.showSaveDialog(w!, { title: 'Save image', defaultPath })
    if (result.canceled || !result.filePath) return { saved: false }

    const buffer = await fetchToBuffer(payload.url)
    await writeFile(result.filePath, buffer)
    return { saved: true, path: result.filePath }
  })

  ipcMain.handle(IPC.DIALOG_OPEN_IMAGE, async (e) => {
    const w = BrowserWindow.fromWebContents(e.sender)
    const result = await dialog.showOpenDialog(w!, {
      title: 'Select image',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const data = await readFile(filePath)
    return {
      name: path.basename(filePath),
      size: data.byteLength,
      data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    }
  })
}
