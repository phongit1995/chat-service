export const PERM_MIC = 'microphone' as const
export const PERM_CAM = 'camera' as const

export const DEVICE_KIND = {
  AUDIO_INPUT: 'audioinput',
  VIDEO_INPUT: 'videoinput',
  AUDIO_OUTPUT: 'audiooutput',
} as const

export const PERM_STATE = {
  GRANTED: 'granted',
  DENIED: 'denied',
  PROMPT: 'prompt',
  UNSUPPORTED: 'unsupported',
} as const

export const REQUEST_RESULT = {
  GRANTED: 'granted',
  DENIED: 'denied',
  ERROR: 'error',
} as const
