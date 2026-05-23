const KEY = 'remembered_login_v1'

export interface RememberedLogin {
  email: string
  password: string
}

export const rememberedLoginStore = {
  read(): RememberedLogin | null {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return null
      const decoded = atob(raw)
      const idx = decoded.indexOf(' ')
      if (idx <= 0) return null
      return { email: decoded.slice(0, idx), password: decoded.slice(idx + 1) }
    } catch {
      return null
    }
  },

  save(email: string, password: string) {
    try {
      localStorage.setItem(KEY, btoa(`${email} ${password}`))
    } catch {}
  },

  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {}
  },
}
