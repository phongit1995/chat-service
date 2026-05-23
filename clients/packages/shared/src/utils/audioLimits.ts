export const MAX_AUDIO_BYTES = 10 * 1024 * 1024
export const MAX_AUDIO_DURATION_SEC = 300
export const WAVEFORM_SAMPLES = 40

export const ALLOWED_AUDIO_MIMES = [
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
] as const

export const ALLOWED_AUDIO_MIMES_ACCEPT = ALLOWED_AUDIO_MIMES.join(',')

const baseMime = (mime: string): string => {
  const idx = mime.indexOf(';')
  return idx >= 0 ? mime.slice(0, idx).trim() : mime.trim()
}

export const isAllowedAudioMime = (mime: string): boolean =>
  (ALLOWED_AUDIO_MIMES as readonly string[]).includes(baseMime(mime).toLowerCase())

export const validateAudioBlob = (blob: Blob, durationSec: number): string | null => {
  if (blob.size === 0) return 'Recording is empty'
  if (blob.size > MAX_AUDIO_BYTES) return 'Recording exceeds 10MB limit'
  if (durationSec <= 0) return 'Recording too short'
  if (durationSec > MAX_AUDIO_DURATION_SEC) return `Maximum duration is ${MAX_AUDIO_DURATION_SEC / 60} minutes`
  if (blob.type && !isAllowedAudioMime(blob.type)) return `Unsupported audio format: ${blob.type}`
  return null
}
