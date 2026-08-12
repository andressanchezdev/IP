import { useCallback, useEffect, useState } from 'react'
import { flushPersistedState, savePersistedState } from '@/shared/lib/storage'
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from '@/features/auth/utils/authStorage'
import {
  getOrCreateUserWorkspace,
  persistUserWorkspace,
} from '@/features/auth/utils/userWorkspace'
import { loginRequest } from '@/features/auth/api/authApi'
import {
  mergeApiProfileWithWorkspace,
  toAuthUserSummary,
} from '@/features/auth/utils/mapLoginUserToProfile'
import { clearApiAuthToken, setApiAuthToken } from '@/shared/api'
import { APP_EVENTS } from '../appEvents'
import { PROFILE_SETTINGS_TTL, sanitizeProfileSettings } from '../helpers'

export function useAuthSlice({ events, cartHydratingRef }) {
  const [authSession, setAuthSession] = useState(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState(false)
  const [pendingEsperaView, setPendingEsperaView] = useState(false)

  const isAuthenticated = Boolean(authSession?.username)
  const currentUserId = authSession?.userId ?? null

  // Rehidratación al cargar/refrescar: la sesión cifrada se lee de forma async.
  useEffect(() => {
    let cancelled = false

    loadAuthSession().then((session) => {
      if (cancelled || !session) {
        return
      }
      setAuthSession(session)
      events.emit(APP_EVENTS.AUTH_RESTORED, { session })
    })

    return () => {
      cancelled = true
    }
  }, [events])

  useEffect(() => {
    if (authSession?.tokenAccess) {
      setApiAuthToken(authSession.tokenAccess)
    } else {
      clearApiAuthToken()
    }
  }, [authSession?.tokenAccess])

  // Otros dominios solicitan login sin acoplarse a este slice.
  useEffect(() => events.on(APP_EVENTS.AUTH_REQUIRED, ({ pending } = {}) => {
    if (pending === 'checkout') {
      setPendingCheckout(true)
    }
    if (pending === 'espera') {
      setPendingEsperaView(true)
    }
    setAuthModalOpen(true)
  }), [events])

  const openAuthModal = useCallback(() => {
    setAuthModalOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false)
    setPendingCheckout(false)
    setPendingEsperaView(false)
  }, [])

  const login = useCallback(async ({ email, password, rememberMe, username }) => {
    const loginEmail = String(email ?? username ?? '').trim()

    try {
      const {
        tokenAccess,
        refreshToken,
        client,
        profileSettings: apiProfile,
      } = await loginRequest({
        email: loginEmail,
        password,
      })
      setApiAuthToken(tokenAccess)

      const userId = client.userId
      const workspace = getOrCreateUserWorkspace(userId, apiProfile)
      const nextProfile = mergeApiProfileWithWorkspace(
        apiProfile,
        workspace.profileSettings,
      )

      if (cartHydratingRef) {
        cartHydratingRef.current = true
      }

      savePersistedState(
        'profileSettings',
        sanitizeProfileSettings(nextProfile),
        PROFILE_SETTINGS_TTL,
      )
      persistUserWorkspace(userId, {
        profileSettings: nextProfile,
        pendingOrders: workspace.pendingOrders ?? [],
        historyOrders: workspace.historyOrders ?? [],
      })

      events.emit(APP_EVENTS.AUTH_LOGIN, {
        userId,
        profile: nextProfile,
        workspace,
      })

      const session = {
        username: client.email || loginEmail,
        email: client.email || loginEmail,
        userId,
        tokenAccess,
        refreshToken: refreshToken || null,
        displayName: client.fullName,
        documentId: client.documentId,
        mobile: client.mobile,
        role: client.role,
        user: toAuthUserSummary(nextProfile),
        profile: nextProfile,
        loggedInAt: new Date().toISOString(),
      }

      setAuthSession(session)
      await saveAuthSession(session, rememberMe)
      setAuthModalOpen(false)

      if (pendingCheckout) {
        setPendingCheckout(false)
        events.emit(APP_EVENTS.POST_LOGIN_NAV, { target: 'checkout' })
      } else if (pendingEsperaView) {
        setPendingEsperaView(false)
        events.emit(APP_EVENTS.POST_LOGIN_NAV, { target: 'espera' })
      }

      return { success: true }
    } catch (error) {
      clearApiAuthToken()
      if (cartHydratingRef) {
        cartHydratingRef.current = false
      }
      return {
        success: false,
        error: error?.message || 'No se pudo iniciar sesión',
      }
    }
  }, [cartHydratingRef, events, pendingCheckout, pendingEsperaView])

  const logout = useCallback(() => {
    // El workspace se persiste de forma continua; solo hace falta el flush.
    flushPersistedState()
    clearApiAuthToken()
    clearAuthSession()
    setAuthSession(null)
    events.emit(APP_EVENTS.AUTH_LOGGED_OUT)
  }, [events])

  return {
    authSession,
    setAuthSession,
    isAuthenticated,
    currentUserId,
    authModalOpen,
    openAuthModal,
    closeAuthModal,
    login,
    logout,
    pendingCheckout,
    pendingEsperaView,
  }
}
