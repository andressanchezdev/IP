import { API_ASSET_BASE_URL } from '@/shared/api/config'

export function resolveAssetUrl(path) {
  if (!path || typeof path !== 'string') {
    return ''
  }

  const trimmed = path.trim()
  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  const normalizedPath = trimmed.replace(/^\/+/, '')
  const base = API_ASSET_BASE_URL.replace(/\/+$/, '')
  return `${base}/${normalizedPath}`
}
