import { RefObject } from 'react'
import { extToMime, validateImageFile } from '@chat/ui'
import { ALLOWED_IMAGE_MIMES } from '@chat/shared'

const formatAllowedList = () =>
  ALLOWED_IMAGE_MIMES.map((m) => m.replace('image/', '').toUpperCase()).join(' / ')

export const useNativeImagePicker = (
  fileInputRef: RefObject<HTMLInputElement>,
  onFile: (file: File) => void,
) => {
  return async () => {
    if (!window.desktop?.pickImage) {
      fileInputRef.current?.click()
      return
    }
    try {
      const picked = await window.desktop.pickImage()
      if (!picked) return
      const mime = extToMime(picked.name)
      if (!mime) {
        alert(`Định dạng không hỗ trợ: ${picked.name}. Chỉ chấp nhận ${formatAllowedList()}.`)
        return
      }
      const file = new File([picked.data], picked.name, { type: mime })
      const err = validateImageFile(file)
      if (err) {
        alert(err)
        return
      }
      onFile(file)
    } catch (err) {
      console.error('native pick failed', err)
      fileInputRef.current?.click()
    }
  }
}
