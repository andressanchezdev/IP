import { loadPersistedState } from '@/shared/lib/storage'
import { defaultProfileSettings } from '@/features/profile/data/profileDefaults'
import { findUserCredentials } from '@/features/auth/utils/authStorage'
import { getOrCreateUserWorkspace } from '@/features/auth/utils/userWorkspace'
import { mergeApiProfileWithWorkspace } from '@/features/auth/utils/mapLoginUserToProfile'
import { getBrandLogoUrl } from '@/shared/lib/brandLogos'

export const PROFILE_SETTINGS_TTL = 365 * 24 * 60 * 60 * 1000

export function normalizeCartItem(item) {
  return {
    ...item,
    brandLogo: item.brandLogo || item.brandLogoUrl || getBrandLogoUrl(item.brand),
    imageUrl: item.imageUrl || '',
  }
}

export function normalizeProduct(product) {
  return {
    ...product,
    brandLogo: product.brandLogo || product.brandLogoUrl || getBrandLogoUrl(product.brand),
    imageUrl: product.imageUrl || '',
  }
}

export function loadInitialUserData(session) {
  if (!session?.userId) {
    return {
      profileSettings: loadPersistedState('profileSettings', defaultProfileSettings),
      pendingOrders: [],
      historyOrders: [],
      // Carrito solo vía API (GET/POST). Sin datos locales.
      cartItems: [],
    }
  }

  // Prioridad: snapshot del login en sesión → workspace → registro local.
  const sessionProfile = session.profile
  const credentials = findUserCredentials(session.username)
  const seedProfile = sessionProfile ?? credentials?.profile ?? defaultProfileSettings
  const workspace = getOrCreateUserWorkspace(session.userId, seedProfile)
  const workspaceProfile = workspace.profileSettings ?? seedProfile

  const profileSettings = sessionProfile
    ? mergeApiProfileWithWorkspace(sessionProfile, workspaceProfile)
    : workspaceProfile

  return {
    profileSettings,
    pendingOrders: workspace.pendingOrders ?? [],
    historyOrders: workspace.historyOrders ?? [],
    cartItems: [],
  }
}
