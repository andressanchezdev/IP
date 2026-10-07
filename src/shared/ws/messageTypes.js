export const WS_PRODUCT_EVENTS = Object.freeze({
  STOCK_CART: 'stock carrito',
  STOCK_CART_INCREASED: 'stock carrito aumentado',
  STOCK_CART_DELETE: 'stock carrito eliminar',
  STOCK_DELETE: 'stock eliminar',
  STOCK_DELETE_ALL: 'stock eliminarTodo',
  PRODUCT_STOCK: 'nuevoControl',
})

const CART_STOCK_TYPES = new Set([
  WS_PRODUCT_EVENTS.STOCK_CART,
  WS_PRODUCT_EVENTS.STOCK_CART_INCREASED,
  WS_PRODUCT_EVENTS.STOCK_CART_DELETE,
  WS_PRODUCT_EVENTS.STOCK_DELETE,
  WS_PRODUCT_EVENTS.STOCK_DELETE_ALL,
])

export function isProductStockMessage(message) {
  const tipo = String(message?.tipo ?? '').trim()
  return CART_STOCK_TYPES.has(tipo)
    || (
      tipo === WS_PRODUCT_EVENTS.PRODUCT_STOCK
      && ['stock', 'ubic'].includes(String(message?.info?.control ?? '').trim())
    )
}
