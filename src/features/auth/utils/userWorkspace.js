import { loadPersistedState, savePersistedState } from '../../../utils/storage'
import { defaultProfileSettings } from '../../landing/data/mockProfile'

const WORKSPACE_TTL = 365 * 24 * 60 * 60 * 1000

export function createEmptyWorkspace(profileSettings) {
  return {
    userId: profileSettings.personal.userId,
    profileSettings,
    pendingOrders: [],
    historyOrders: [],
    cart: [],
  }
}

export function loadUserWorkspace(userId) {
  if (!userId) {
    return null
  }

  return loadPersistedState(`userWorkspace:${userId}`, null)
}

export function saveUserWorkspace(userId, workspace) {
  if (!userId) {
    return
  }

  savePersistedState(`userWorkspace:${userId}`, workspace, WORKSPACE_TTL)
}

function migrateLegacyOrders(userId) {
  const legacyPending = loadPersistedState('pendingOrders', [])
  const legacyHistory = loadPersistedState('historyOrders', [])

  const hasLegacy = legacyPending.length > 0 || legacyHistory.length > 0
  if (!hasLegacy && userId !== defaultProfileSettings.personal.userId) {
    return null
  }

  if (userId !== defaultProfileSettings.personal.userId && !hasLegacy) {
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
    cart: loadPersistedState('cart', []),
  }
}

export function getOrCreateUserWorkspace(userId, profileSettings) {
  const stored = loadUserWorkspace(userId)
  if (stored) {
    return stored
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

  saveUserWorkspace(userId, workspace)
}
