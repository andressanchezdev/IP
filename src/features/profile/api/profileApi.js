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
