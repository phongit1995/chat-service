import axios, { AxiosInstance } from 'axios'
import env from '../config/env'

export const createHttpClient = (): AxiosInstance => {
  const api = axios.create({
    baseURL: `${env.apiBaseUrl}/api`,
    headers: { 'Content-Type': 'application/json' },
  })

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    },
  )

  return api
}

export const http = createHttpClient()
