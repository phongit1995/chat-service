interface EnvConfig {
  apiBaseUrl: string
  wsUrl: string
  isDevelopment: boolean
  isProduction: boolean
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key] || defaultValue
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`)
  }
  return value
}

const apiBaseUrl = getEnvVar('VITE_API_BASE_URL', 'http://localhost:8080')

export const env: EnvConfig = {
  apiBaseUrl,
  wsUrl: apiBaseUrl, // Use same URL for WebSocket
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
}

export default env
