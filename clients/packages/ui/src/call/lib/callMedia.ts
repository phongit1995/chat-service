import { Track, type LocalParticipant } from 'livekit-client'
import { REQUEST_RESULT } from '../constants'
import type { RequestResult } from '../interfaces'

export type MediaSource = Track.Source.Microphone | Track.Source.Camera

const NOT_ALLOWED_ERROR = 'NotAllowedError'

const constraintsFor = (source: MediaSource): MediaStreamConstraints =>
  source === Track.Source.Microphone ? { audio: true } : { video: true }

const enableFor = async (p: LocalParticipant, source: MediaSource) => {
  if (source === Track.Source.Microphone) await p.setMicrophoneEnabled(true)
  else await p.setCameraEnabled(true)
}

/**
 * Ask for permission via raw getUserMedia (so the browser shows a prompt from
 * the user gesture) and then publish the track via LiveKit.
 */
export async function requestAndPublish(
  p: LocalParticipant,
  source: MediaSource,
): Promise<RequestResult> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraintsFor(source))
    stream.getTracks().forEach((t) => t.stop())
    await enableFor(p, source)
    return REQUEST_RESULT.GRANTED
  } catch (e) {
    if ((e as DOMException)?.name === NOT_ALLOWED_ERROR) return REQUEST_RESULT.DENIED
    return REQUEST_RESULT.ERROR
  }
}

export const sourceLabel = (s: MediaSource) =>
  s === Track.Source.Microphone ? 'Microphone' : 'Camera'

export const permDeniedHint = (s: MediaSource) =>
  `${sourceLabel(s)} access is blocked.\n\n` +
  'To enable, click the lock icon in your browser address bar → ' +
  `Site settings → allow ${sourceLabel(s).toLowerCase()}, then reload.`
