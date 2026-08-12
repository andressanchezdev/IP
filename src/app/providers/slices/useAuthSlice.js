import { useCallback, useEffect, useState } from 'react'
import { flushPersistedState, savePersistedState } from '@/shared/lib/storage'
import { defaultProfileSettings } from '@/features/profile/data/profileDefaults'
import {
  clearAuthSession,
  loadAuthSession,
  registerUser,
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
import { loadInitialUserData, PROFILE_SETTINGS_TTL } from '../helpers'

export function useAuthSlice({ crossRef, cartHydratingRef }) {
  const [authSession, setAuthSession] = useState(() => loadAuthSession())
  const [initialUserData] = useState(() => loadInitialUserData(authSession))
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('login')
  const [pendingCheckout, setPendingCheckout] = useState(false)
  const [pendingEsperaView, setPendingEsperaView] = useState(false)

  const isAuthenticated = Boolean(authSession?.username)
  const currentUserId = authSession?.userId ?? null

  useEffect(() => {
    if (authSession?.tokenAccess) {
      setApiAuthToken(authSession.tokenAccess)
    } else {
      clearApiAuthToken()
    }
  }, [authSession?.tokenAccess])

  const openAuthModal = useCallback((mode = 'login') => {
    setAuthModalMode(mode)
    setAuthModalOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false)
    setAuthModalMode('login')
    setPendingCheckout(false)
    setPendingEsperaView(false)
  }, [])

  const switchAuthModalMode = useCallback((mode) => {
    setAuthModalMode(mode)
  }, [])

  const openAuthForCart = useCallback(() => {
    setAuthModalOpen(true)
    setAuthModalMode('login')
  }, [])

  const applyUserWorkspace = useCallback((credentials) => {
    const {
      setProfileSettings,
      setPendingOrders,
      setHistoryOrders,
      setCartItems,
    } = crossRef.current

    const userId = credentials.profile.personal.userId
    const workspace = getOrCreateUserWorkspace(userId, credentials.profile)

    setProfileSettings(workspace.profileSettings ?? credentials.profile)
    setPendingOrders(workspace.pendingOrders ?? [])
    setHistoryOrders(workspace.historyOrders ?? [])
    setCartItems([])

    return {
      username: credentials.username,
      userId,
      loggedInAt: new Date().toISOString(),
    }
  }, [crossRef])

  const login = useCallback(async ({ email, password, rememberMe, username }) => {
    const {
      setProfileSettings,
      setPendingOrders,
      setHistoryOrders,
      setCartItems,
      setProducts,
      setLastProductId,
      setHasMoreProducts,
      setCartCheckoutStep,
      setDrawerType,
      setDrawerOpen,
      setActiveView,
    } = crossRef.current

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
      const authUser = toAuthUserSummary(nextProfile)

      if (cartHydratingRef) {
        cartHydratingRef.current = true
      }
      // Datos personales siempre desde la respuesta de login (user.usuario).
      setProfileSettings(nextProfile)
      savePersistedState('profileSettings', nextProfile, PROFILE_SETTINGS_TTL)
      persistUserWorkspace(userId, {
        profileSettings: nextProfile,
        pendingOrders: workspace.pendingOrders ?? [],
        historyOrders: workspace.historyOrders ?? [],
      })
      setPendingOrders(workspace.pendingOrders ?? [])
      setHistoryOrders(workspace.historyOrders ?? [])
      setProducts([])
      setLastProductId(null)
      setHasMoreProducts(false)
      // Cart se hidrata solo desde GET /api/v1/inventory/carts (no localStorage).
      setCartItems([])

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
        user: authUser,
        profile: nextProfile,
        loggedInAt: new Date().toISOString(),
      }

      setAuthSession(session)
      saveAuthSession(session, rememberMe)
      setAuthModalOpen(false)
      setAuthModalMode('login')

      if (pendingCheckout) {
        setPendingCheckout(false)
        setCartCheckoutStep(1)
        setDrawerType('cart')
        setDrawerOpen(true)
      } else if (pendingEsperaView) {
        setPendingEsperaView(false)
        setActiveView('espera')
      }

      return { success: true }
    } catch (error) {
      clearApiAuthToken()
      if (cartHydratingRef) {
        cartHydratingRef.current = false
      }
      crossRef.current.setHasMoreProducts?.(false)
      return {
        success: false,
        error: error?.message || 'No se pudo iniciar sesión',
      }
    }
  }, [cartHydratingRef, crossRef, pendingCheckout, pendingEsperaView])

  const register = useCallback((formData) => {
    const {
      setCartCheckoutStep,
      setDrawerType,
      setDrawerOpen,
      setActiveView,
    } = crossRef.current

    const result = registerUser(formData)

    if (!result.success) {
      return result
    }

    const session = applyUserWorkspace(result.user)

    setAuthSession(session)
    saveAuthSession(session, true)
    setAuthModalOpen(false)
    setAuthModalMode('login')

    if (pendingCheckout) {
      setPendingCheckout(false)
      setCartCheckoutStep(1)
      setDrawerType('cart')
      setDrawerOpen(true)
    } else if (pendingEsperaView) {
      setPendingEsperaView(false)
      setActiveView('espera')
    }

    return { success: true }
  }, [applyUserWorkspace, crossRef, pendingCheckout, pendingEsperaView])

  const logout = useCallback(() => {
    const {
      profileSettings,
      pendingOrders,
      historyOrders,
      setProfileSettings,
      setPendingOrders,
      setHistoryOrders,
      setCartItems,
      setProducts,
      setLastProductId,
      setHasMoreProducts,
      setFilters,
      setFilterNuevos,
      setFilterPromociones,
      setWithStock,
      setSearchValue,
      setSearchProducts,
      setActiveView,
      setDrawerOpen,
      resetOrderDrawer,
    } = crossRef.current

    if (currentUserId) {
      persistUserWorkspace(currentUserId, {
        profileSettings,
        pendingOrders,
        historyOrders,
      })
      flushPersistedState()
    }

    clearApiAuthToken()
    clearAuthSession()
    setAuthSession(null)
    setProfileSettings(defaultProfileSettings)
    setPendingOrders([])
    setHistoryOrders([])
    setCartItems([])
    setProducts([])
    setLastProductId(null)
    setHasMoreProducts(false)
    setFilters({ brands: [], categories: [], models: [] })
    setFilterNuevos(false)
    setFilterPromociones(false)
    setWithStock(false)
    setSearchValue('')
    setSearchProducts(null)
    setActiveView('tienda')
    setDrawerOpen(false)
    resetOrderDrawer()
  }, [crossRef, currentUserId])

  return {
    authSession,
    setAuthSession,
    initialUserData,
    isAuthenticated,
    currentUserId,
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    openAuthModal,
    closeAuthModal,
    switchAuthModalMode,
    openAuthForCart,
    login,
    register,
    logout,
    applyUserWorkspace,
    pendingCheckout,
    setPendingCheckout,
    pendingEsperaView,
    setPendingEsperaView,
  }
}
