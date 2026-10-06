export const REALTIME_TYPES = {
  STOCK_CART: 'stock carrito',
  STOCK_DELETE: 'stock eliminar',
  STOCK_DELETE_ALL: 'stock eliminarTodo',
  INGRESO: 'ingreso',
  TOMA_PEDIDO: 'tomaPedido',
  LIBERAR_PEDIDO: 'liberarPedido',
  DESPACHO: 'despacho',
  PACKING: 'packing',
  PICKING: 'picking',
  PICKING_CHANGE_CONFIRM: 'picking cambio corroborar',
  VENTA: 'venta',
  TRASLADO: 'traslado',
}

const SPANISH_CART_ACTIONS = new Set([
  'agregar carrito',
  'eliminar carrito',
  'aumentar cantidad',
  'disminuir cantidad',
  'vaciar carrito',
])

const ORDER_FLOW = new Set([
  REALTIME_TYPES.TOMA_PEDIDO,
  REALTIME_TYPES.LIBERAR_PEDIDO,
  REALTIME_TYPES.DESPACHO,
  REALTIME_TYPES.PACKING,
  REALTIME_TYPES.PICKING,
  REALTIME_TYPES.PICKING_CHANGE_CONFIRM,
  REALTIME_TYPES.VENTA,
  REALTIME_TYPES.TRASLADO,
])

export function isSpanishCartAction(tipo) {
  return SPANISH_CART_ACTIONS.has(String(tipo || '').trim())
}

/** `despacho pedido` es el aviso viejo del mismo paso que `despacho`. */
export function resolveOrderFlowTipo(tipo) {
  const raw = String(tipo || '').trim()
  if (!raw) return ''
  const [head, second] = raw.split(/\s+/)
  if (head === 'despacho' && second === 'pedido') return REALTIME_TYPES.DESPACHO
  return ORDER_FLOW.has(raw) ? raw : ''
}
