interface EnvConfig {
  apiBaseUrl: string
  wsUrl: string
  appName: string
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

export const env: EnvConfig = {
  apiBaseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:8080'),
  wsUrl: getEnvVar('VITE_WS_URL', 'http://localhost:8080'),
  appName: getEnvVar('VITE_APP_NAME', 'Chat Server'),
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
}

export default env
