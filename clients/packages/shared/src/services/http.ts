import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import env from '../config/env'

const REFRESH_URL = '/auth/refresh'
const LOGIN_URL = '/auth/login'
const REGISTER_URL = '/auth/register'

type Subscriber = (token: string | null) => void

let isRefreshing = false
let pending: Subscriber[] = []

const subscribe = (cb: Subscriber) => { pending.push(cb) }
const broadcast = (token: string | null) => {
  pending.forEach((cb) => cb(token))
  pending = []
}

const handleUnauthorized = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

const refreshAccessToken = async (refreshToken: string): Promise<string | null> => {
  try {
    const res = await axios.post(
      `${env.apiBaseUrl}/api${REFRESH_URL}`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    )
    const data = res.data?.data
    if (data?.token && data?.refreshToken) {
      localStorage.setItem('accessToken', data.token)
      localStorage.setItem('refreshToken', data.refreshToken)
      return data.token
    }
    return null
  } catch {
    return null
  }
}

export const createHttpClient = (): AxiosInstance => {
  const api = axios.create({
    baseURL: `${env.apiBaseUrl}/api`,
    headers: { 'Content-Type': 'application/json' },
  })

  api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
      const status = error.response?.status
      const url = original?.url || ''

      if (
        status !== 401 ||
        !original ||
        original._retry ||
        url.includes(REFRESH_URL) ||
        url.includes(LOGIN_URL) ||
        url.includes(REGISTER_URL)
      ) {
        if (status === 401) handleUnauthorized()
        return Promise.reject(error)
      }

      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        handleUnauthorized()
        return Promise.reject(error)
      }

      original._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribe((newToken) => {
            if (!newToken) {
              reject(error)
              return
            }
            original.headers = original.headers || {}
            ;(original.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
            resolve(api.request(original))
          })
        })
      }

      isRefreshing = true
      const newToken = await refreshAccessToken(refreshToken)
      isRefreshing = false
      broadcast(newToken)

      if (!newToken) {
        handleUnauthorized()
        return Promise.reject(error)
      }

      original.headers = original.headers || {}
      ;(original.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
      return api.request(original)
    },
  )

  return api
}

export const http = createHttpClient()
