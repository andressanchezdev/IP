import { API_BASE_URL } from './config'

let authToken = null
let activeApiRequests = 0
let apiLoadingSuppressionCount = 0
const apiActivityListeners = new Set()

function getVisibleApiActivityCount() {
  return apiLoadingSuppressionCount > 0 ? 0 : activeApiRequests
}

export function subscribeApiActivity(listener) {
  apiActivityListeners.add(listener)
  listener(getVisibleApiActivityCount())

  return () => apiActivityListeners.delete(listener)
}

function notifyApiActivity() {
  const count = getVisibleApiActivityCount()
  apiActivityListeners.forEach((listener) => listener(count))
}

export function suppressApiLoadingIndicator() {
  apiLoadingSuppressionCount += 1
  notifyApiActivity()

  let released = false
  return () => {
    if (released) return
    released = true
    apiLoadingSuppressionCount = Math.max(0, apiLoadingSuppressionCount - 1)
    notifyApiActivity()
  }
}

export function setApiAuthToken(token) {
  authToken = token || null
}

export function getApiAuthToken() {
  return authToken
}

export function clearApiAuthToken() {
  authToken = null
}

export class ApiError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text ? { message: text } : null
}

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    token = authToken,
    signal,
  } = options

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  }

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  activeApiRequests += 1
  notifyApiActivity()

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })

    const payload = await parseResponseBody(response)

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        payload?.data?.message ||
        `Error HTTP ${response.status}`

      throw new ApiError(message, { status: response.status, payload })
    }

    return payload
  } finally {
    activeApiRequests = Math.max(0, activeApiRequests - 1)
    notifyApiActivity()
  }
}
