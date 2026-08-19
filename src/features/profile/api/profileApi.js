import { apiRequest } from '@/shared/api'

function extractAboutData(payload) {
  const data = payload?.data ?? payload
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data
  }
  return {}
}

export async function getUserAbout({ token, signal } = {}) {
  const payload = await apiRequest('/api/v1/managment/users/about', {
    method: 'GET',
    token,
    signal,
  })

  return {
    data: extractAboutData(payload),
    raw: payload,
  }
}

/**
 * POST /api/v1/managment/users/change
 * Body: { old_password, new_password }
 */
export async function changeUserPassword({
  token,
  oldPassword,
  newPassword,
  signal,
} = {}) {
  const payload = await apiRequest('/api/v1/managment/users/change', {
    method: 'POST',
    token,
    body: {
      old_password: String(oldPassword ?? ''),
      new_password: String(newPassword ?? ''),
    },
    signal,
  })

  return {
    raw: payload,
  }
}
