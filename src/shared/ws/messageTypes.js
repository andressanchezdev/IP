export const WS_PRODUCT_EVENTS = Object.freeze({
  STOCK_CART: 'stock carrito',
  STOCK_DELETE: 'stock eliminar',
  STOCK_DELETE_ALL: 'stock eliminarTodo',
  PRODUCT_STOCK: 'nuevoControl',
})

export function isProductStockMessage(message) {
  const tipo = String(message?.tipo ?? '').trim()
  return tipo === WS_PRODUCT_EVENTS.STOCK_CART
    || tipo === WS_PRODUCT_EVENTS.STOCK_DELETE
    || tipo === WS_PRODUCT_EVENTS.STOCK_DELETE_ALL
    || (
      tipo === WS_PRODUCT_EVENTS.PRODUCT_STOCK
      && ['stock', 'ubic'].includes(String(message?.info?.control ?? '').trim())
    )
}
