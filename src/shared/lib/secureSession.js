/**
 * Bóveda de sesión: la sesión se guarda cifrada (AES-GCM) y la llave vive
 * como CryptoKey NO extraíble en IndexedDB. El storage nunca contiene tokens
 * ni claves en texto plano; sin la llave del navegador el blob es ilegible.
 */
const DB_NAME = 'importadora-premium-vault'
const DB_STORE = 'keys'
const KEY_ID = 'session-key'
const STORAGE_KEY = 'importadora-premium:secure-session'

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }
  return window.localStorage
}

function openVaultDb() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DB_STORE)) {
        request.result.createObjectStore(DB_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getSessionKey() {
  const db = await openVaultDb()

  try {
    const existing = await idbRequest(
      db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(KEY_ID),
    )
    if (existing) {
      return existing
    }

    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
    await idbRequest(
      db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).put(key, KEY_ID),
    )
    return key
  } finally {
    db.close()
  }
}

function bytesToBase64(bytes) {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return window.btoa(binary)
}

function base64ToBytes(value) {
  const binary = window.atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function saveSecureSession(value, ttlMs) {
  const storage = getStorage()
  if (!storage) {
    return
  }

  if (value == null) {
    storage.removeItem(STORAGE_KEY)
    return
  }

  const key = await getSessionKey()
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  )

  storage.setItem(STORAGE_KEY, JSON.stringify({
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(ciphertext)),
    expiresAt: Date.now() + ttlMs,
  }))
}

export async function loadSecureSession() {
  const storage = getStorage()
  if (!storage) {
    return null
  }

  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const payload = JSON.parse(raw)
    if (payload?.expiresAt && Date.now() > payload.expiresAt) {
      storage.removeItem(STORAGE_KEY)
      return null
    }

    const key = await getSessionKey()
    const plaintext = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(payload.iv) },
      key,
      base64ToBytes(payload.data),
    )
    return JSON.parse(new TextDecoder().decode(plaintext))
  } catch {
    // Blob corrupto o llave regenerada: la sesión no es recuperable.
    storage.removeItem(STORAGE_KEY)
    return null
  }
}

export function clearSecureSession() {
  getStorage()?.removeItem(STORAGE_KEY)
}
