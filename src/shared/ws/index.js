/**
 * Capa de transporte WebSocket (sin lógica de negocio).
 * El dominio de stock vive en `@/features/catalog/ws`.
 */
export {
  WS_URL,
  ZERO_WAREHOUSE_FALLBACK_ID,
  WS_MESSAGE_TYPES,
  WS_CART_ACTIONS,
  isSpanishCartActionTipo,
  isStockWsTipo,
  isOrderFlowWsTipo,
} from './config'
export { normalizeWarehouseId, normalizeWsMessage } from './normalizeMessage'
export {
  connectStockSocket,
  disconnectStockSocket,
  reconnectStockSocket,
  getStockSocketStatus,
  getStockSocketUrl,
  subscribeStockSocket,
  isStockSocketConnected,
  sendStockSocketMessage,
} from './stockSocket'
