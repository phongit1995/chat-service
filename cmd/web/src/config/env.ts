interface EnvConfig {
  apiBaseUrl: string
  wsUrl: string
  isDevelopment: boolean
  isProduction: boolean
}

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return import.meta.env[key] || defaultValue
}

const apiBaseUrl = getEnvVar('VITE_API_BASE_URL', '')

export const env: EnvConfig = {
  apiBaseUrl,
  wsUrl: apiBaseUrl,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
}

export default env
