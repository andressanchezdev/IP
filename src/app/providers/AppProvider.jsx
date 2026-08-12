import { useCallback, useEffect, useMemo, useRef } from 'react'
import { clearExpiredStorage } from '@/shared/lib/storage'
import { persistUserWorkspace } from '@/features/auth/utils/userWorkspace'
import { toAuthUserSummary } from '@/features/auth/utils/mapLoginUserToProfile'
import {
  AuthContext,
  CartContext,
  OrdersContext,
  CatalogContext,
  ProfileContext,
  UiContext,
} from './storeContexts'
import { useAuthSlice } from './slices/useAuthSlice'
import { useUiSlice } from './slices/useUiSlice'
import { useOrdersSlice } from './slices/useOrdersSlice'
import { useProfileSlice } from './slices/useProfileSlice'
import { useCartSlice } from './slices/useCartSlice'
import { useCatalogSlice } from './slices/useCatalogSlice'

export function AppProvider({ children }) {
  const crossRef = useRef({})
  const productsRef = useRef([])
  const cartHydratingRef = useRef(false)
  const syncFilterDraftRef = useRef(() => {})
  const resetOrderDrawerRef = useRef(() => {})
  const setCartCheckoutStepRef = useRef(() => {})
  const releaseHandlersRef = useRef({
    onReleaseCache: () => {},
    onDeleteAccount: () => {},
  })

  const syncFilterDraftFromApplied = useCallback((...args) => {
    syncFilterDraftRef.current(...args)
  }, [])
  const resetOrderDrawer = useCallback((...args) => {
    resetOrderDrawerRef.current(...args)
  }, [])
  const setCartCheckoutStep = useCallback((...args) => {
    setCartCheckoutStepRef.current(...args)
  }, [])
  const onReleaseCache = useCallback(() => {
    releaseHandlersRef.current.onReleaseCache()
  }, [])
  const onDeleteAccount = useCallback(() => {
    releaseHandlersRef.current.onDeleteAccount()
  }, [])

  const auth = useAuthSlice({ crossRef, cartHydratingRef })
  const { initialUserData } = auth

  const ui = useUiSlice({
    syncFilterDraftFromApplied,
    resetOrderDrawer,
    setCartCheckoutStep,
    authUsername: auth.authSession?.username,
    setPendingEsperaView: auth.setPendingEsperaView,
    setAuthModalOpen: auth.setAuthModalOpen,
    setAuthModalMode: auth.setAuthModalMode,
  })

  const orders = useOrdersSlice({
    initialPendingOrders: initialUserData.pendingOrders,
    initialHistoryOrders: initialUserData.historyOrders,
    setDrawerOpen: ui.setDrawerOpen,
    setDrawerType: ui.setDrawerType,
    setActiveView: ui.setActiveView,
  })
  resetOrderDrawerRef.current = orders.resetOrderDrawer

  const profile = useProfileSlice({
    currentUserId: auth.currentUserId,
    initialProfileSettings: initialUserData.profileSettings,
    onReleaseCache,
    onDeleteAccount,
  })

  const cart = useCartSlice({
    tokenAccess: auth.authSession?.tokenAccess,
    productsRef,
    authUsername: auth.authSession?.username,
    openAuthForCart: auth.openAuthForCart,
    setPendingCheckout: auth.setPendingCheckout,
    setActiveView: ui.setActiveView,
    setDrawerOpen: ui.setDrawerOpen,
    setDrawerType: ui.setDrawerType,
    resetOrderDrawer: orders.resetOrderDrawer,
    setPendingOrders: orders.setPendingOrders,
    currentUserId: auth.currentUserId,
    initialCartItems: initialUserData.cartItems,
    cartHydratingRef,
  })
  setCartCheckoutStepRef.current = cart.setCartCheckoutStep

  const catalog = useCatalogSlice({
    tokenAccess: auth.authSession?.tokenAccess,
    userId: auth.authSession?.userId,
    applyCartFromApi: cart.applyCartFromApi,
    warehouseIdRef: profile.warehouseIdRef,
    setDrawerOpen: ui.setDrawerOpen,
    setCartCheckoutStep: cart.setCartCheckoutStep,
    resetOrderDrawer: orders.resetOrderDrawer,
    cartHydratingRef,
  })
  productsRef.current = catalog.products
  syncFilterDraftRef.current = catalog.syncFilterDraftFromApplied

  releaseHandlersRef.current.onReleaseCache = () => {
    catalog.resetCatalogForCacheClear()
    cart.setCartItems([])
    orders.setPendingOrders([])
    orders.setHistoryOrders([])
  }

  releaseHandlersRef.current.onDeleteAccount = () => {
    auth.setAuthSession(null)
    catalog.resetCatalogForCacheClear()
    cart.setCartItems([])
    orders.setPendingOrders([])
    orders.setHistoryOrders([])
    ui.setDrawerOpen(false)
    orders.resetOrderDrawer()
  }

  crossRef.current = {
    profileSettings: profile.profileSettings,
    pendingOrders: orders.pendingOrders,
    historyOrders: orders.historyOrders,
    setProfileSettings: profile.setProfileSettings,
    setPendingOrders: orders.setPendingOrders,
    setHistoryOrders: orders.setHistoryOrders,
    setCartItems: cart.setCartItems,
    setProducts: catalog.setProducts,
    setLastProductId: catalog.setLastProductId,
    setHasMoreProducts: catalog.setHasMoreProducts,
    setFilters: catalog.setFilters,
    setFilterNuevos: catalog.setFilterNuevos,
    setFilterPromociones: catalog.setFilterPromociones,
    setWithStock: catalog.setWithStock,
    setSearchValue: catalog.setSearchValue,
    setSearchProducts: catalog.setSearchProducts,
    setCartCheckoutStep: cart.setCartCheckoutStep,
    setDrawerType: ui.setDrawerType,
    setDrawerOpen: ui.setDrawerOpen,
    setActiveView: ui.setActiveView,
    resetOrderDrawer: orders.resetOrderDrawer,
  }

  useEffect(() => {
    if (!auth.currentUserId) {
      return
    }

    persistUserWorkspace(auth.currentUserId, {
      profileSettings: profile.profileSettings,
      pendingOrders: orders.pendingOrders,
      historyOrders: orders.historyOrders,
    })
  }, [
    auth.currentUserId,
    profile.profileSettings,
    orders.pendingOrders,
    orders.historyOrders,
  ])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      clearExpiredStorage()
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  const authUser = useMemo(() => {
    if (!auth.isAuthenticated) {
      return null
    }

    // profileSettings (mapeado del login) es la fuente de verdad en UI.
    const fromProfile = toAuthUserSummary(profile.profileSettings)
    if (fromProfile.userId || fromProfile.fullName) {
      return fromProfile
    }

    return auth.authSession?.user ?? null
  }, [auth.authSession?.user, auth.isAuthenticated, profile.profileSettings])

  const authValue = useMemo(() => ({
    isAuthenticated: auth.isAuthenticated,
    user: authUser,
    userId: authUser?.userId || auth.currentUserId,
    displayName: authUser?.fullName || auth.authSession?.displayName || '',
    authModalOpen: auth.authModalOpen,
    authModalMode: auth.authModalMode,
    openAuthModal: auth.openAuthModal,
    closeAuthModal: auth.closeAuthModal,
    switchAuthModalMode: auth.switchAuthModalMode,
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
    pendingCheckout: auth.pendingCheckout,
    pendingEsperaView: auth.pendingEsperaView,
  }), [
    auth.isAuthenticated,
    authUser,
    auth.currentUserId,
    auth.authSession?.displayName,
    auth.authModalOpen,
    auth.authModalMode,
    auth.openAuthModal,
    auth.closeAuthModal,
    auth.switchAuthModalMode,
    auth.login,
    auth.register,
    auth.logout,
    auth.pendingCheckout,
    auth.pendingEsperaView,
  ])

  const cartValue = cart.value
  const ordersValue = orders.value
  const catalogValue = catalog.value
  const profileValue = profile.value
  const uiValue = ui.value

  return (
    <AuthContext.Provider value={authValue}>
      <CartContext.Provider value={cartValue}>
        <OrdersContext.Provider value={ordersValue}>
          <CatalogContext.Provider value={catalogValue}>
            <ProfileContext.Provider value={profileValue}>
              <UiContext.Provider value={uiValue}>
                {children}
              </UiContext.Provider>
            </ProfileContext.Provider>
          </CatalogContext.Provider>
        </OrdersContext.Provider>
      </CartContext.Provider>
    </AuthContext.Provider>
  )
}
