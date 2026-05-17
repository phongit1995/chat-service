export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const HARD_UPLOAD_BYTES = 20 * 1024 * 1024
export const MAX_IMAGE_DIMENSION = 1920

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

export const ALLOWED_IMAGE_MIMES_ACCEPT = ALLOWED_IMAGE_MIMES.join(',')

export const isAllowedImageMime = (mime: string): boolean =>
  (ALLOWED_IMAGE_MIMES as readonly string[]).includes(mime)
