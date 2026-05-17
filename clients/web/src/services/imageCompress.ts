import { MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION } from '../utils/imageLimits'

const QUALITY_STEPS = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality))

export interface CompressResult {
  file: File
  width: number
  height: number
  mimeType: string
}

export async function compressImage(input: File): Promise<CompressResult> {
  if (input.type === 'image/gif') {
    if (input.size > MAX_IMAGE_BYTES) throw new Error('GIF quá lớn (>2MB)')
    return { file: input, width: 0, height: 0, mimeType: 'image/gif' }
  }

  const img = await loadImage(input)
  let { width, height } = img
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')
  ctx.drawImage(img, 0, 0, width, height)

  const targetMime = input.type === 'image/png' && (input as unknown as { _keepPng?: boolean })._keepPng ? 'image/png' : 'image/jpeg'

  for (const q of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, targetMime, q)
    if (!blob) continue
    if (blob.size <= MAX_IMAGE_BYTES) {
      const ext = targetMime === 'image/png' ? 'png' : 'jpg'
      const name = input.name.replace(/\.[^.]+$/, '') + '.' + ext
      return {
        file: new File([blob], name, { type: targetMime }),
        width,
        height,
        mimeType: targetMime,
      }
    }
  }

  const ratio = 0.7
  width = Math.round(width * ratio)
  height = Math.round(height * ratio)
  canvas.width = width
  canvas.height = height
  ctx.drawImage(img, 0, 0, width, height)
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.5)
  if (!blob || blob.size > MAX_IMAGE_BYTES) {
    throw new Error('Không thể nén ảnh xuống ≤2MB')
  }
  const name = input.name.replace(/\.[^.]+$/, '') + '.jpg'
  return {
    file: new File([blob], name, { type: 'image/jpeg' }),
    width,
    height,
    mimeType: 'image/jpeg',
  }
}
