import { useMemo } from 'react'
import { toAuthUserSummary } from '@/features/auth/utils/mapLoginUserToProfile'

export function useAuthContextValue(auth, profileSettings) {
  const authUser = useMemo(() => {
    if (!auth.isAuthenticated) {
      return null
    }

    const fromProfile = toAuthUserSummary(profileSettings)
    if (fromProfile.userId || fromProfile.fullName) {
      return fromProfile
    }

    return auth.authSession?.user ?? null
  }, [auth.authSession?.user, auth.isAuthenticated, profileSettings])

  return useMemo(() => ({
    isAuthenticated: auth.isAuthenticated,
    user: authUser,
    userId: authUser?.userId || auth.currentUserId,
    displayName: authUser?.fullName || auth.authSession?.displayName || '',
    tokenAccess: auth.authSession?.tokenAccess || null,
    authModalOpen: auth.authModalOpen,
    openAuthModal: auth.openAuthModal,
    closeAuthModal: auth.closeAuthModal,
    login: auth.login,
    logout: auth.logout,
    pendingCheckout: auth.pendingCheckout,
    pendingEsperaView: auth.pendingEsperaView,
  }), [
    auth.isAuthenticated,
    authUser,
    auth.currentUserId,
    auth.authSession?.displayName,
    auth.authSession?.tokenAccess,
    auth.authModalOpen,
    auth.openAuthModal,
    auth.closeAuthModal,
    auth.login,
    auth.logout,
    auth.pendingCheckout,
    auth.pendingEsperaView,
  ])
}
