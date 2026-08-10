export const WS_URL =
  import.meta.env.VITE_WS_URL || 'wss://api.importadorapremium.com/wss2/'

/** Si idBodega viene como 0 / "0", se reemplaza por este valor. */
export const ZERO_WAREHOUSE_FALLBACK_ID = '6'

export const WS_RECONNECT_BASE_MS = 1000
export const WS_RECONNECT_MAX_MS = 30_000

/**
 * Tipos reales observados en wss://api.importadorapremium.com/wss2/
 */
export const WS_MESSAGE_TYPES = {
  STOCK_CART: 'stock carrito',
  STOCK_DELETE: 'stock eliminar',
  STOCK_DELETE_ALL: 'stock eliminarTodo',
  TOMA_PEDIDO: 'tomaPedido',
  DESPACHO: 'despacho',
  PACKING: 'packing',
  PICKING: 'picking',
  PICKING_CHANGE_CONFIRM: 'picking cambio corroborar',
  VENTA: 'venta',
  TRASLADO: 'traslado',
}

/**
 * Tipos de acción de carrito en español (campo `tipo`).
 * Compatibles con el flujo local ↔ WS.
 */
export const WS_CART_ACTIONS = {
  ADD: 'agregar carrito',
  REMOVE: 'eliminar carrito',
  INCREASE: 'aumentar cantidad',
  DECREASE: 'disminuir cantidad',
  CLEAR: 'vaciar carrito',
}

const SPANISH_CART_ACTION_SET = new Set(Object.values(WS_CART_ACTIONS))

const STOCK_TIPOS = new Set([
  WS_MESSAGE_TYPES.STOCK_CART,
  WS_MESSAGE_TYPES.STOCK_DELETE,
  WS_MESSAGE_TYPES.STOCK_DELETE_ALL,
  ...SPANISH_CART_ACTION_SET,
])

const ORDER_FLOW_TIPOS = new Set([
  WS_MESSAGE_TYPES.TOMA_PEDIDO,
  WS_MESSAGE_TYPES.DESPACHO,
  WS_MESSAGE_TYPES.PACKING,
  WS_MESSAGE_TYPES.PICKING,
  WS_MESSAGE_TYPES.PICKING_CHANGE_CONFIRM,
  WS_MESSAGE_TYPES.VENTA,
  WS_MESSAGE_TYPES.TRASLADO,
])

export function isSpanishCartActionTipo(tipo) {
  return SPANISH_CART_ACTION_SET.has(String(tipo || '').trim())
}

export function isStockWsTipo(tipo) {
  return STOCK_TIPOS.has(String(tipo || '').trim())
}

export function isOrderFlowWsTipo(tipo) {
  return ORDER_FLOW_TIPOS.has(String(tipo || '').trim())
}
