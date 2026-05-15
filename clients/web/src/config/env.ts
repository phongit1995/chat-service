interface EnvConfig {
  apiBaseUrl: string
  wsUrl: string
  livekitUrl: string
  isDevelopment: boolean
  isProduction: boolean
}

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return import.meta.env[key] || defaultValue
}

// Use relative URL by default so the web app works on any domain via nginx proxy.
// When VITE_API_BASE_URL is explicitly set (e.g. different API domain), use that instead.
const apiBaseUrl = getEnvVar('VITE_API_BASE_URL', '')

export const env: EnvConfig = {
  apiBaseUrl,
  wsUrl: apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
  livekitUrl: getEnvVar('VITE_LIVEKIT_URL', ''),
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
}

export default env
