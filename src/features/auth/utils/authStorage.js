import {
  clearSecureSession,
  loadSecureSession,
  saveSecureSession,
} from '@/shared/lib/secureSession'

const AUTH_SESSION_TTL = 30 * 24 * 60 * 60 * 1000
const AUTH_SESSION_SHORT_TTL = 8 * 60 * 60 * 1000

// Claves antiguas con datos sensibles en texto plano: se purgan al cargar.
const LEGACY_PLAINTEXT_KEYS = [
  'importadora-premium:authSession',
  'importadora-premium:registeredUsers',
]

function purgeLegacyPlaintextStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  LEGACY_PLAINTEXT_KEYS.forEach((key) => window.localStorage.removeItem(key))
}

export async function loadAuthSession() {
  purgeLegacyPlaintextStorage()

  const session = await loadSecureSession()

  if (!session?.username && !session?.email) {
    return null
  }

  if (!session.username && session.email) {
    session.username = session.email
  }

  return session
}

export function saveAuthSession(session, rememberMe = false) {
  const ttl = rememberMe ? AUTH_SESSION_TTL : AUTH_SESSION_SHORT_TTL
  return saveSecureSession(session, ttl)
}

export function clearAuthSession() {
  clearSecureSession()
}
