import { APP_EVENTS } from '../appEvents'

/**
 * Reacciones a eventos de pedidos.
 * Historial (sidebar) = vista `espera` (PendingOrdersView).
 */
export function createOrdersWiring({ orders, ui }) {
  return {
    [APP_EVENTS.ORDER_CREATED]: ({ order } = {}) => {
      if (order) {
        orders.addPendingOrder?.(order)
      }
      orders.resetOrderDrawer()
      ui.setActiveView('espera')
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
