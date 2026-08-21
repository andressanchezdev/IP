import { defaultProfileSettings } from '@/features/profile/data/profileDefaults'
import { APP_EVENTS } from '../appEvents'
import { loadInitialUserData } from '../helpers'

/**
 * Reacciones a eventos de autenticación / cuenta.
 */
export function createAuthWiring({
  auth,
  profile,
  orders,
  cart,
  catalog,
  ui,
}) {
  return {
    [APP_EVENTS.AUTH_RESTORED]: ({ session }) => {
      const data = loadInitialUserData(session)
      profile.setProfileSettings(data.profileSettings)
      orders.setPendingOrders([])
      orders.setHistoryOrders([])
    },

    [APP_EVENTS.AUTH_LOGIN]: ({ profile: nextProfile }) => {
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
}
