/**
 * Bus de eventos de la app: cada slice emite eventos de dominio y el wiring
 * entre dominios (auth↔cart↔catalog↔orders↔ui) vive solo en AppProvider.
 * Los slices no reciben setters de otros slices.
 */
export const APP_EVENTS = {
  /** payload: { pending?: 'checkout' | 'espera' } */
  AUTH_REQUIRED: 'auth:required',
  /** payload: { userId, profile, workspace } */
  AUTH_LOGIN: 'auth:login',
  /** payload: { session } */
  AUTH_RESTORED: 'auth:restored',
  AUTH_LOGGED_OUT: 'auth:logged-out',
  /** payload: { target: 'checkout' | 'espera' } */
  POST_LOGIN_NAV: 'auth:post-login-nav',
  /** payload: { order } */
  ORDER_CREATED: 'order:created',
  /** Pedido totalmente pagado: navegar a historial. */
  ORDER_COMPLETED: 'order:completed',
  ORDER_OPENED: 'order:opened',
  FILTERS_APPLIED: 'catalog:filters-applied',
  /** payload: { type } */
  DRAWER_OPENED: 'ui:drawer-opened',
  DRAWER_CLOSED: 'ui:drawer-closed',
  CACHE_RELEASED: 'profile:cache-released',
  ACCOUNT_DELETED: 'profile:account-deleted',
}

export function createAppEvents() {
  const listeners = new Map()

  return {
    on(event, handler) {
      const handlers = listeners.get(event) ?? new Set()
      handlers.add(handler)
      listeners.set(event, handlers)
      return () => handlers.delete(handler)
    },
    emit(event, payload) {
      listeners.get(event)?.forEach((handler) => handler(payload))
    },
  }
}
