const STORAGE_PREFIX = 'importadora-premium'
const DEFAULT_TTL = 5 * 60 * 1000
const SAVE_DEBOUNCE_MS = 280

const pendingSaves = new Map()

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  return window.localStorage
}

function buildKey(key) {
  return `${STORAGE_PREFIX}:${key}`
}

function writePersistedState(key, value, ttl = DEFAULT_TTL) {
  const storage = getStorage()

  if (!storage) {
    return
  }

  const payload = {
    value,
    expiresAt: Date.now() + ttl,
  }

  storage.setItem(buildKey(key), JSON.stringify(payload))
}

export function savePersistedState(key, value, ttl = DEFAULT_TTL) {
  const storage = getStorage()

  if (!storage) {
    return
  }

  const existing = pendingSaves.get(key)
  if (existing) {
    window.clearTimeout(existing.timeoutId)
  }

  const timeoutId = window.setTimeout(() => {
    writePersistedState(key, value, ttl)
    pendingSaves.delete(key)
  }, SAVE_DEBOUNCE_MS)

  pendingSaves.set(key, { timeoutId, value, ttl })
}

export function flushPersistedState() {
  pendingSaves.forEach(({ timeoutId, value, ttl }, key) => {
    window.clearTimeout(timeoutId)
    writePersistedState(key, value, ttl)
  })
  pendingSaves.clear()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPersistedState)
  window.addEventListener('beforeunload', flushPersistedState)
}

export function loadPersistedState(key, fallback) {
  const storage = getStorage()

  if (!storage) {
    return fallback
  }

  try {
    const rawValue = storage.getItem(buildKey(key))

    if (!rawValue) {
      return fallback
    }

    const parsed = JSON.parse(rawValue)

    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      storage.removeItem(buildKey(key))
      return fallback
    }

    return parsed.value
  } catch {
    return fallback
  }
}

export function clearExpiredStorage() {
  const storage = getStorage()

  if (!storage) {
    return 0
  }

  let removed = 0

  Object.keys(storage).forEach((storageKey) => {
    if (!storageKey.startsWith(STORAGE_PREFIX)) {
      return
    }

    try {
      const parsed = JSON.parse(storage.getItem(storageKey))
      if (parsed?.expiresAt && Date.now() > parsed.expiresAt) {
        storage.removeItem(storageKey)
        removed += 1
      }
    } catch {
      storage.removeItem(storageKey)
      removed += 1
    }
  })

  return removed
}

const CACHE_KEYS = ['products', 'cart', 'pendingOrders', 'historyOrders']

export function clearAppCache() {
  const storage = getStorage()

  if (!storage) {
    return 0
  }

  CACHE_KEYS.forEach((key) => {
    const pending = pendingSaves.get(key)
    if (pending) {
      window.clearTimeout(pending.timeoutId)
      pendingSaves.delete(key)
    }
    storage.removeItem(buildKey(key))
  })

  clearExpiredStorage()
  return CACHE_KEYS.length
}
