import { create } from 'zustand'
import toast from 'react-hot-toast'
import { callService } from '../services/call.service'
import { userService } from '../services/user.service'
import { env } from '../config/env'
import type { CallTokenResponse, CallType } from '../types/call'
import type {
  IncomingCallData,
  CallAcceptedData,
  CallDeclinedData,
  CallEndedData,
} from '../types/realtime'

export type CallMode = 'idle' | 'incoming' | 'outgoing' | 'active'

export interface CallerBrief {
  id: string
  username?: string
  fullName?: string
  avatar?: string
}

export interface ActiveCall {
  callId: string
  conversationId: string
  callType: CallType
  roomName: string
  wsUrl: string
  token: string
  peer: CallerBrief
}

export interface IncomingCall extends IncomingCallData {
  caller: CallerBrief
}

export interface WidgetPosition {
  x: number
  y: number
}

interface CallState {
  mode: CallMode
  incoming: IncomingCall | null
  active: ActiveCall | null
  expanded: boolean
  /** Persisted position of the mini widget across minimize/expand cycles */
  miniPos: WidgetPosition | null
  /** Persisted position of the incoming call popup */
  incomingPos: WidgetPosition | null
  /** Persisted mic/cam state across minimize/expand */
  micMuted: boolean
  camOff: boolean
  /** True after endActive/declineIncoming is called locally so onEnded can skip duplicate toast */
  localEnded: boolean

  startCall: (conversationId: string, callType: CallType, peer: CallerBrief) => Promise<void>
  answerIncoming: () => Promise<void>
  declineIncoming: () => Promise<void>
  endActive: () => Promise<void>
  setExpanded: (expanded: boolean) => void
  setMiniPos: (pos: WidgetPosition) => void
  setIncomingPos: (pos: WidgetPosition) => void
  setMicMuted: (muted: boolean) => void
  setCamOff: (off: boolean) => void

  onIncoming: (data: IncomingCallData) => Promise<void>
  onAccepted: (data: CallAcceptedData) => void
  onDeclined: (data: CallDeclinedData) => void
  onEnded: (data: CallEndedData) => void
}

const IDLE_STATE = {
  mode: 'idle' as CallMode,
  incoming: null,
  active: null,
  expanded: false,
  miniPos: null,
  incomingPos: null,
  micMuted: false,
  camOff: false,
  localEnded: false,
}

const toActiveCall = (data: CallTokenResponse, peer: CallerBrief): ActiveCall => ({
  callId: data.callId,
  conversationId: data.conversationId,
  callType: data.callType,
  roomName: data.roomName,
  wsUrl: data.wsUrl || env.livekitUrl,
  token: data.token,
  peer,
})

const errorMessage = (e: unknown, fallback: string): string => {
  const err = e as { response?: { data?: { error?: string } }; message?: string }
  return err?.response?.data?.error || err?.message || fallback
}

export const formatCallDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const peerDisplayName = (peer: CallerBrief): string =>
  peer.fullName || peer.username || 'Unknown'

const resolveCaller = async (data: IncomingCallData): Promise<CallerBrief> => {
  try {
    const res = await userService.getUserInfo(data.callerId)
    const u = res.data
    if (u) {
      return { id: u.id, username: u.username, fullName: u.fullName, avatar: u.avatar }
    }
  } catch {
    // ignore — keep minimal caller info
  }
  return { id: data.callerId }
}

export const useCallStore = create<CallState>((set, get) => ({
  ...IDLE_STATE,

  startCall: async (conversationId, callType, peer) => {
    try {
      const res = await callService.start(conversationId, callType)
      const active = toActiveCall(res.data as CallTokenResponse, peer)
      set({ mode: 'outgoing', incoming: null, active, expanded: true })
    } catch (e) {
      toast.error(errorMessage(e, 'Failed to start call'))
    }
  },

  answerIncoming: async () => {
    const incoming = get().incoming
    if (!incoming) return
    try {
      const res = await callService.answer(incoming.callId)
      const active = toActiveCall(res.data as CallTokenResponse, incoming.caller)
      set({ mode: 'active', incoming: null, active, expanded: true })
    } catch (e) {
      toast.error(errorMessage(e, 'Failed to answer call'))
      set(IDLE_STATE)
    }
  },

  setExpanded: (expanded) => set({ expanded }),
  setMiniPos: (miniPos) => set({ miniPos }),
  setIncomingPos: (incomingPos) => set({ incomingPos }),
  setMicMuted: (micMuted) => set({ micMuted }),
  setCamOff: (camOff) => set({ camOff }),

  declineIncoming: async () => {
    const incoming = get().incoming
    if (!incoming) return
    set({ ...IDLE_STATE, localEnded: true })
    callService.decline(incoming.callId).catch(() => {})
    toast('Call declined', { icon: '📵' })
  },

  endActive: async () => {
    const active = get().active
    const wasActive = get().mode === 'active'
    if (!active) return
    set({ ...IDLE_STATE, localEnded: true })
    callService.end(active.callId).catch(() => {})
    // Local feedback — server CALL_ENDED will arrive but may race or be missed
    // by this tab if it was the one initiating end. Show toast immediately.
    if (wasActive) {
      toast('Call ended', { icon: '📞' })
    } else {
      toast('Call cancelled', { icon: '✕' })
    }
  },

  onIncoming: async (data) => {
    if (get().mode !== 'idle') {
      // Already busy — auto-decline so the caller knows.
      callService.decline(data.callId).catch(() => {})
      return
    }
    const caller = await resolveCaller(data)
    // Re-check mode in case the user started/answered something while we were
    // resolving the caller profile.
    if (get().mode !== 'idle') return
    set({ mode: 'incoming', incoming: { ...data, caller }, active: null })
  },

  onAccepted: (data) => {
    const { active, mode } = get()
    if (mode === 'outgoing' && active?.callId === data.callId) {
      set({ mode: 'active' })
    }
  },

  onDeclined: (data) => {
    const { active } = get()
    if (active?.callId !== data.callId) return
    const peerName = active.peer.fullName || active.peer.username || 'User'
    toast(`${peerName} declined`, { icon: '📵' })
    set(IDLE_STATE)
  },

  onEnded: (data) => {
    const { active, incoming, localEnded } = get()
    const isOurIncoming = incoming?.callId === data.callId
    const isOurActive = active?.callId === data.callId
    if (!isOurIncoming && !isOurActive) return

    // If we locally triggered end/decline, we already showed a toast and reset
    // state. Just clear the localEnded flag and bail.
    if (localEnded) {
      set({ localEnded: false })
      return
    }

    set(IDLE_STATE)

    if (data.status === 'missed') {
      toast(isOurIncoming ? 'Missed call' : 'No answer', { icon: '📵' })
    } else if (data.status === 'declined') {
      // declined toast already shown in onDeclined; skip here.
      return
    } else if (data.durationSeconds > 0) {
      toast.success(`Call ended · ${formatCallDuration(data.durationSeconds)}`)
    } else {
      toast('Call ended', { icon: '📞' })
    }
  },
}))
