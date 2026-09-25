type Store = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const memory = new Map<string, string>()

const memoryStore: Store = {
  getItem(key) {
    return memory.get(key) ?? null
  },
  setItem(key, value) {
    memory.set(key, value)
  },
  removeItem(key) {
    memory.delete(key)
  },
}

/** Claves que solo deben vivir en memoria (o sessionStorage para sesión de chat). */
const LEGACY_BROWSER_KEYS = [
  'landing-page-content',
  'botip-settings',
  'botip-md-active',
  'botip-md-slot',
  'botip-md-uploaded',
  'botip-md-factory-local',
  'botip-chat-usage',
  'botip-chat-blocked-until',
  'botip-chat-recent',
]

/** Persistencia de sesión de chat: sessionStorage (pestaña), no localStorage. */
const SESSION_PERSIST_KEYS = new Set(['botip-chat-session'])

function discardLegacyBrowserCopies() {
  try {
    const local = globalThis.window?.localStorage
    const session = globalThis.window?.sessionStorage
    for (const key of LEGACY_BROWSER_KEYS) {
      local?.removeItem(key)
      session?.removeItem(key)
    }
    /* Limpiar copias viejas de sesión en localStorage; conservar sessionStorage. */
    local?.removeItem('botip-chat-session')
  } catch {
    /* ignore */
  }
}

discardLegacyBrowserCopies()

function browserStore(kind: 'local' | 'session'): Storage | null {
  try {
    if (kind === 'session') return globalThis.window?.sessionStorage ?? null
    return globalThis.window?.localStorage ?? null
  } catch {
    return null
  }
}

export function readStore(kind: 'local' | 'session', key: string) {
  if (kind === 'session' && SESSION_PERSIST_KEYS.has(key)) {
    const browser = browserStore('session')
    try {
      const fromBrowser = browser?.getItem(key)
      if (fromBrowser != null) {
        memoryStore.setItem(key, fromBrowser)
        return fromBrowser
      }
    } catch {
      /* ignore */
    }
  }
  return memoryStore.getItem(key)
}

export function writeStore(kind: 'local' | 'session', key: string, value: string) {
  memoryStore.setItem(key, value)
  if (kind === 'session' && SESSION_PERSIST_KEYS.has(key)) {
    try {
      browserStore('session')?.setItem(key, value)
    } catch {
      /* ignore quota / private mode */
    }
  }
}

export function removeStore(kind: 'local' | 'session', key: string) {
  memoryStore.removeItem(key)
  if (kind === 'session' && SESSION_PERSIST_KEYS.has(key)) {
    try {
      browserStore('session')?.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}

export function clearMemoryStore() {
  memory.clear()
}
