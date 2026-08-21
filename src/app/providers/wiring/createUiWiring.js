import { APP_EVENTS } from '../appEvents'

/**
 * Reacciones a eventos de UI (drawers / filtros).
 */
export function createUiWiring({ orders, cart, catalog, profile, ui }) {
  return {
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
  }
}
