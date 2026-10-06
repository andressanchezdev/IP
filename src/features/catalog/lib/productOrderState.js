/**
 * Estado visible del botón de producto.
 * `stock` es cantidadAux de la bodega del cliente (libre tras todas las reservas, incluidas las propias).
 * Si las últimas unidades están en mi carrito, el botón es "Ordenado", no "Agotado".
 */
export function resolveProductOrderState({ stock = 0, isInCart = false, isOrdering = false } = {}) {
  if (isOrdering) return 'ordering'
  if (isInCart) return 'ordered'
  if (Number(stock) <= 0) return 'soldout'
  return 'order'
}

const LABELS = {
  ordering: 'Ordenando…',
  ordered: 'Ordenado',
  soldout: 'Agotado',
  order: 'Ordenar',
}

export function productOrderLabel(state) {
  return LABELS[state] ?? LABELS.order
}
