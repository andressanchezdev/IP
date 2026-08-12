import { loadPersistedState, savePersistedState } from '@/shared/lib/storage'
import { defaultProfileSettings } from '@/features/profile/data/profileDefaults'

const WORKSPACE_TTL = 365 * 24 * 60 * 60 * 1000

export function createEmptyWorkspace(profileSettings) {
  return {
    userId: profileSettings.personal.userId,
    profileSettings,
    pendingOrders: [],
    historyOrders: [],
    cart: [],
    cartUpdatedAt: null,
  }
}

export function loadUserWorkspace(userId) {
  if (!userId) {
    return null
  }

  return loadPersistedState(`userWorkspace:${userId}`, null)
}

/** Nunca persistir contraseñas en storage local. */
function stripSensitiveData(workspace) {
  const profileSettings = workspace?.profileSettings
  if (!profileSettings?.access?.password) {
    return workspace
  }

  return {
    ...workspace,
    profileSettings: {
      ...profileSettings,
      access: { ...profileSettings.access, password: '' },
    },
  }
}

export function saveUserWorkspace(userId, workspace) {
  if (!userId) {
    return
  }

  savePersistedState(`userWorkspace:${userId}`, stripSensitiveData(workspace), WORKSPACE_TTL)
}

function migrateLegacyOrders(userId) {
  const legacyPending = loadPersistedState('pendingOrders', [])
  const legacyHistory = loadPersistedState('historyOrders', [])
  const hasLegacy = legacyPending.length > 0 || legacyHistory.length > 0

  if (!hasLegacy) {
    return null
  }

  const assignUserId = (order) => ({
    ...order,
    userId: order.userId ?? userId,
  })

  return {
    userId,
    profileSettings: loadPersistedState('profileSettings', defaultProfileSettings),
    pendingOrders: legacyPending.map(assignUserId),
    historyOrders: legacyHistory.map(assignUserId),
    cart: [],
    cartUpdatedAt: new Date().toISOString(),
  }
}

export function getOrCreateUserWorkspace(userId, profileSettings) {
  const stored = loadUserWorkspace(userId)
  if (stored) {
    return {
      ...createEmptyWorkspace(profileSettings),
      ...stored,
      userId,
    }
  }

  const migrated = migrateLegacyOrders(userId)
  if (migrated) {
    saveUserWorkspace(userId, migrated)
    return migrated
  }

  const workspace = createEmptyWorkspace(profileSettings)
  saveUserWorkspace(userId, workspace)
  return workspace
}

export function persistUserWorkspace(userId, workspace) {
  if (!userId) {
    return
  }

  const current = loadUserWorkspace(userId) || createEmptyWorkspace({
    personal: { userId },
  })

  saveUserWorkspace(userId, {
    ...current,
    ...workspace,
    userId,
  })
}

