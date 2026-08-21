import { APP_EVENTS } from '../appEvents'

/**
 * Reacciones a liberar caché de perfil.
 */
export function createCacheWiring({ catalog, cart, orders }) {
  return {
    [APP_EVENTS.CACHE_RELEASED]: () => {
      catalog.resetCatalogForCacheClear()
      cart.setCartItems([])
      orders.setPendingOrders([])
      orders.setHistoryOrders([])
    },
  }
}
