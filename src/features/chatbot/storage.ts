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
  'botip-chat-session',
]

function discardLegacyBrowserCopies() {
  try {
    const local = globalThis.window?.localStorage
    const session = globalThis.window?.sessionStorage
    for (const key of LEGACY_BROWSER_KEYS) {
      local?.removeItem(key)
      session?.removeItem(key)
    }
  } catch {
    /* ignore */
  }
}

discardLegacyBrowserCopies()

export function readStore(_kind: 'local' | 'session', key: string) {
  return memoryStore.getItem(key)
}

export function writeStore(_kind: 'local' | 'session', key: string, value: string) {
  memoryStore.setItem(key, value)
}

export function removeStore(_kind: 'local' | 'session', key: string) {
  memoryStore.removeItem(key)
}

export function clearMemoryStore() {
  memory.clear()
}
