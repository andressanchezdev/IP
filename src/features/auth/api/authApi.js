import { apiRequest } from '@/shared/api'
import {
  mapLoginUserToClient,
  mapLoginUserToProfileSettings,
} from '@/features/auth/utils/mapLoginUserToProfile'

function pickToken(payload, keys) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const data = payload.data && typeof payload.data === 'object' ? payload.data : null
  const candidates = keys.flatMap((key) => [payload[key], data?.[key]])

  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() ?? null
}

function pickAccessToken(payload) {
  return pickToken(payload, [
    'access_token',
    'token_access',
    'token_acces',
    'token',
  ])
}

function pickRefreshToken(payload) {
  return pickToken(payload, [
    'refresh_token',
    'token_refresh',
    'refreshToken',
  ])
}

function pickUser(payload) {
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload
  if (!data || typeof data !== 'object') {
    return null
  }

  const nested = data.user
  if (nested && typeof nested === 'object') {
    return nested
  }

  if (data.id != null || data.id_usuario != null || data.email != null) {
    return data
  }

  return null
}

/**
 * POST /api/v1/auth/login
 * Normaliza tokens + user.usuario (JSON) para consumo en la app.
 */
export async function loginRequest({ email, password }) {
  const loginEmail = String(email ?? '').trim()
  const payload = await apiRequest('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: loginEmail,
      password,
    },
    token: null,
  })

  const tokenAccess = pickAccessToken(payload)
  if (!tokenAccess) {
    throw new Error('La API no devolvió access_token')
  }

  const user = pickUser(payload)
  if (!user) {
    throw new Error('La API no devolvió datos de usuario')
  }

  const client = mapLoginUserToClient(loginEmail, user)
  const profileSettings = mapLoginUserToProfileSettings(loginEmail, user)

  return {
    tokenAccess,
    refreshToken: pickRefreshToken(payload),
    user,
    client,
    profileSettings,
    raw: payload,
  }
}
