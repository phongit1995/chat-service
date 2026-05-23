import { useSyncExternalStore } from 'react'

interface PlaybackState {
  currentId: string | null
  speed: number
}

const SPEED_KEY = 'audio:playback:speed'

const initialSpeed = (() => {
  if (typeof localStorage === 'undefined') return 1
  const raw = localStorage.getItem(SPEED_KEY)
  const n = raw ? parseFloat(raw) : NaN
  return Number.isFinite(n) && [1, 1.5, 2].includes(n) ? n : 1
})()

let state: PlaybackState = { currentId: null, speed: initialSpeed }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const setCurrent = (id: string | null) => {
  if (state.currentId === id) return
  state = { ...state, currentId: id }
  emit()
}

export const setSpeed = (s: number) => {
  if (state.speed === s) return
  if (typeof localStorage !== 'undefined') localStorage.setItem(SPEED_KEY, String(s))
  state = { ...state, speed: s }
  emit()
}

export const useCurrentAudioId = (): string | null =>
  useSyncExternalStore(subscribe, () => state.currentId, () => state.currentId)

export const useAudioSpeed = (): number =>
  useSyncExternalStore(subscribe, () => state.speed, () => state.speed)
