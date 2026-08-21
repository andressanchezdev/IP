import { useRef, useState } from 'react'
import {
  AuthContext,
  CartContext,
  OrdersContext,
  CatalogContext,
  ProfileContext,
  UiContext,
} from './storeContexts'
import { createAppEvents } from './appEvents'
import { loadInitialUserData } from './helpers'
import { useAuthSlice } from './slices/useAuthSlice'
import { useUiSlice } from './slices/useUiSlice'
import { useOrdersSlice } from './slices/useOrdersSlice'
import { useProfileSlice } from './slices/useProfileSlice'
import { useCartSlice } from './slices/useCartSlice'
import { useCatalogSlice } from './slices/useCatalogSlice'
import { useAppDomainWiring } from './wiring/useAppDomainWiring'
import { usePersistUserWorkspace } from './hooks/usePersistUserWorkspace'
import { useExpiredStorageCleaner } from './hooks/useExpiredStorageCleaner'
import { useAuthContextValue } from './hooks/useAuthContextValue'
import { syncCatalogProductsRef } from './hooks/syncCatalogProductsRef'

/**
 * Compone slices + providers. El acoplamiento entre dominios vive en wiring/.
 */
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
    tokenAccess: auth.authSession?.tokenAccess,
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

  syncCatalogProductsRef(productsRef, catalog)

  useAppDomainWiring({ events, auth, profile, orders, cart, catalog, ui })
  usePersistUserWorkspace(auth.currentUserId, profile.profileSettings)
  useExpiredStorageCleaner()

  const authValue = useAuthContextValue(auth, profile.profileSettings)

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
