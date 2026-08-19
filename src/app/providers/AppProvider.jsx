import { useEffect, useMemo, useRef, useState } from 'react'
import { clearExpiredStorage } from '@/shared/lib/storage'
import { persistUserWorkspace } from '@/features/auth/utils/userWorkspace'
import { toAuthUserSummary } from '@/features/auth/utils/mapLoginUserToProfile'
import { defaultProfileSettings } from '@/features/profile/data/profileDefaults'
import {
  AuthContext,
  CartContext,
  OrdersContext,
  CatalogContext,
  ProfileContext,
  UiContext,
} from './storeContexts'
import { APP_EVENTS, createAppEvents } from './appEvents'
import { loadInitialUserData } from './helpers'
import { useAuthSlice } from './slices/useAuthSlice'
import { useUiSlice } from './slices/useUiSlice'
import { useOrdersSlice } from './slices/useOrdersSlice'
import { useProfileSlice } from './slices/useProfileSlice'
import { useCartSlice } from './slices/useCartSlice'
import { useCatalogSlice } from './slices/useCatalogSlice'

export function AppProvider({ children }) {
  const [events] = useState(() => createAppEvents())
  const [initialUserData] = useState(() => loadInitialUserData(null))
  const productsRef = useRef([])
  const cartHydratingRef = useRef(false)

  const auth = useAuthSlice({ events, cartHydratingRef })

  const ui = useUiSlice({
    events,
    authUsername: auth.authSession?.username,
  })

  const orders = useOrdersSlice({
    events,
    initialPendingOrders: initialUserData.pendingOrders,
    initialHistoryOrders: initialUserData.historyOrders,
  })

  const profile = useProfileSlice({
    events,
    initialProfileSettings: initialUserData.profileSettings,
    tokenAccess: auth.authSession?.tokenAccess,
    authEmail: auth.authSession?.email,
  })

  const cart = useCartSlice({
    events,
    tokenAccess: auth.authSession?.tokenAccess,
    productsRef,
    authUsername: auth.authSession?.username,
    currentUserId: auth.currentUserId,
    initialCartItems: initialUserData.cartItems,
    cartHydratingRef,
  })

  const catalog = useCatalogSlice({
    events,
    tokenAccess: auth.authSession?.tokenAccess,
    userId: auth.authSession?.userId,
    applyCartFromApi: cart.applyCartFromApi,
    applyCartFromPayload: cart.applyCartFromPayload,
    warehouseIdRef: profile.warehouseIdRef,
    cartHydratingRef,
  })
  productsRef.current = catalog.products
  if (Array.isArray(catalog.value?.latestProducts) && catalog.value.latestProducts.length > 0) {
    const seen = new Set(catalog.products.map((product) => String(product.id)))
    productsRef.current = [
      ...catalog.products,
      ...catalog.value.latestProducts.filter((product) => !seen.has(String(product.id))),
    ]
  }

  // Único punto de acoplamiento entre dominios: cada slice emite eventos y
  // aquí se decide cómo reaccionan los demás.
  const wiringRef = useRef({})
  wiringRef.current = {
    [APP_EVENTS.AUTH_RESTORED]: ({ session }) => {
      const data = loadInitialUserData(session)
      profile.setProfileSettings(data.profileSettings)
      orders.setPendingOrders([])
      orders.setHistoryOrders([])
    },
    [APP_EVENTS.AUTH_LOGIN]: ({ profile: nextProfile, workspace }) => {
      profile.setProfileSettings(nextProfile)
      orders.setPendingOrders([])
      orders.setHistoryOrders([])
      // Cart se hidrata solo desde GET /api/v1/inventory/carts.
      cart.setCartItems([])
      catalog.resetCatalogProducts()
    },
    [APP_EVENTS.AUTH_LOGGED_OUT]: () => {
      profile.setProfileSettings(defaultProfileSettings)
      orders.setPendingOrders([])
      orders.setHistoryOrders([])
      orders.resetOrderDrawer()
      cart.setCartItems([])
      catalog.resetCatalogForCacheClear()
      ui.setActiveView('tienda')
      ui.setDrawerOpen(false)
    },
    [APP_EVENTS.POST_LOGIN_NAV]: ({ target }) => {
      if (target === 'checkout') {
        cart.setCartCheckoutStep(1)
        ui.setDrawerType('cart')
        ui.setDrawerOpen(true)
      } else if (target === 'espera') {
        ui.setActiveView('espera')
      }
    },
    [APP_EVENTS.ORDER_CREATED]: ({ order }) => {
      orders.resetOrderDrawer()
      ui.setActiveView('historial')
      ui.setDrawerOpen(false)
    },
    [APP_EVENTS.ORDER_COMPLETED]: () => {
      ui.setDrawerOpen(false)
      ui.setActiveView('historial')
    },
    [APP_EVENTS.ORDER_OPENED]: () => {
      ui.setDrawerType('order')
      ui.setDrawerOpen(true)
    },
    [APP_EVENTS.FILTERS_APPLIED]: () => {
      ui.closeDrawer()
    },
    [APP_EVENTS.DRAWER_OPENED]: ({ type }) => {
      if (type !== 'order') {
        orders.resetOrderDrawer()
      }
      if (type === 'filter') {
        catalog.syncFilterDraftFromApplied()
      }
      if (type === 'profile') {
        profile.loadProfileFromAboutApi()
      }
    },
    [APP_EVENTS.DRAWER_CLOSED]: () => {
      cart.setCartCheckoutStep(0)
      orders.resetOrderDrawer()
    },
    [APP_EVENTS.CACHE_RELEASED]: () => {
      catalog.resetCatalogForCacheClear()
      cart.setCartItems([])
      orders.setPendingOrders([])
      orders.setHistoryOrders([])
    },
    [APP_EVENTS.ACCOUNT_DELETED]: () => {
      auth.setAuthSession(null)
      catalog.resetCatalogForCacheClear()
      cart.setCartItems([])
      orders.setPendingOrders([])
      orders.setHistoryOrders([])
      orders.resetOrderDrawer()
      ui.setDrawerOpen(false)
    },
  }

  useEffect(() => {
    const unsubscribes = Object.values(APP_EVENTS).map((event) => (
      events.on(event, (payload) => wiringRef.current[event]?.(payload))
    ))

    return () => unsubscribes.forEach((off) => off())
  }, [events])

  useEffect(() => {
    if (!auth.currentUserId) {
      return
    }

    persistUserWorkspace(auth.currentUserId, {
      profileSettings: profile.profileSettings,
    })
  }, [
    auth.currentUserId,
    profile.profileSettings,
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

  return (
    <AuthContext.Provider value={authValue}>
      <CartContext.Provider value={cart.value}>
        <OrdersContext.Provider value={orders.value}>
          <CatalogContext.Provider value={catalog.value}>
            <ProfileContext.Provider value={profile.value}>
              <UiContext.Provider value={ui.value}>
                {children}
              </UiContext.Provider>
            </ProfileContext.Provider>
          </CatalogContext.Provider>
        </OrdersContext.Provider>
      </CartContext.Provider>
    </AuthContext.Provider>
  )
}
