import type { ImageMetadata } from '../types'

export const parseImageMeta = (raw?: string): ImageMetadata | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as ImageMetadata
  } catch {
    return null
  }
}

export const buildImageMetadataJSON = (meta: ImageMetadata): string => JSON.stringify(meta)
