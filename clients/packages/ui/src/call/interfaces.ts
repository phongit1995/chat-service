import type { DEVICE_KIND, PERM_STATE, PERM_MIC, PERM_CAM, REQUEST_RESULT } from './constants'

export type PermName = typeof PERM_MIC | typeof PERM_CAM
export type PermState = (typeof PERM_STATE)[keyof typeof PERM_STATE]
export type DeviceKind = (typeof DEVICE_KIND)[keyof typeof DEVICE_KIND]
export type RequestResult = (typeof REQUEST_RESULT)[keyof typeof REQUEST_RESULT]

export interface DeviceList {
  audioinput: MediaDeviceInfo[]
  videoinput: MediaDeviceInfo[]
  audiooutput: MediaDeviceInfo[]
}
