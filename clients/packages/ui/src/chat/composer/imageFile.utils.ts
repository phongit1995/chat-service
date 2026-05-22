import {
  ALLOWED_IMAGE_MIMES,
  HARD_UPLOAD_BYTES,
  isAllowedImageMime,
} from '@chat/shared'

const formatAllowedList = () =>
  ALLOWED_IMAGE_MIMES.map((m) => m.replace('image/', '').toUpperCase()).join(' / ')

export const validateImageFile = (file: File): string | null => {
  if (!isAllowedImageMime(file.type)) {
    return `Định dạng không hỗ trợ: ${file.type || 'unknown'}. Chỉ chấp nhận ${formatAllowedList()}.`
  }
  if (file.size > HARD_UPLOAD_BYTES) {
    return `Ảnh quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa ${HARD_UPLOAD_BYTES / 1024 / 1024}MB trước khi nén.`
  }
  return null
}

export const extToMime = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  return ''
}
