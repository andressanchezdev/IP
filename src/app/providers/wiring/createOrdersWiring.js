import { APP_EVENTS } from '../appEvents'

/**
 * Reacciones a eventos de pedidos.
 */
export function createOrdersWiring({ orders, ui }) {
  return {
    [APP_EVENTS.ORDER_CREATED]: () => {
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
  }
}
