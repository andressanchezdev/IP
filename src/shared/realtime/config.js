import { runtimeConfig } from '@/shared/runtimeConfig'

/** Canal único de la app. La URL de despliegue sigue viniendo de app-config / .env. */
export const REALTIME_URL = String(
  runtimeConfig.WS_URL
  ?? import.meta.env.VITE_WS_URL
  ?? 'wss://api.importadorapremium.com/wss2/',
).trim()

/** Reintento y vigilante local cuando el canal no está listo. Una conexión estable no se recicla. */
export const REALTIME_RETRY_MS = 1500
export const REALTIME_CONNECT_TIMEOUT_MS = 10_000
export const REALTIME_IDLE_RECYCLE_MS = 180_000
export const REALTIME_WAKE_SILENCE_MS = 45_000

export {
  REALTIME_TYPES,
  isSpanishCartAction,
  resolveOrderFlowTipo,
} from './messageTypes'
