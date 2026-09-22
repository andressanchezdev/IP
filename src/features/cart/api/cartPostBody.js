/**
 * Contrato único de POST /api/v1/inventory/carts:
 * { id_producto, cantidad, precio_unitario } + Bearer token.
 */

export const CART_UNIT_PRICE_ERROR =
  'Este producto no puede ser agregado a carrito, error sobre su valor unitario'

export function toCartProductId(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return NaN
  }
  return numeric
}

export function toCartQuantity(value, fallback = 1) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback
  }
  return Math.floor(numeric)
}

export function toCartUnitPrice(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0
  }
  return numeric
}

export function resolveCartProductId(product, fallbackId) {
  const candidates = [
    product?.id_producto,
    product?.idProducto,
    product?.id,
    fallbackId,
  ]
  for (const value of candidates) {
    const id = toCartProductId(value)
    if (Number.isFinite(id)) {
      return id
    }
  }
  return NaN
}

export function resolveCartUnitPrice(product) {
  return toCartUnitPrice(product?.precio ?? product?.price ?? product?.precio_unitario)
}

export function resolveCartStock(product) {
  const numeric = Number(product?.stock ?? product?.cantidad)
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0
  }
  return numeric
}

/**
 * Body exacto que viaja en el POST.
 * Ejemplo: { id_producto: 7704790200048, cantidad: 1, precio_unitario: 28000 }
 */
export function buildCartPostBody({ idProducto, cantidad, precioUnitario } = {}) {
  const body = {
    id_producto: toCartProductId(idProducto),
    cantidad: toCartQuantity(cantidad, 1),
    precio_unitario: toCartUnitPrice(precioUnitario),
  }
  if (!Number.isFinite(body.id_producto)) {
    throw new Error('id_producto inválido')
  }
  if (!(body.precio_unitario > 0)) {
    throw new Error(CART_UNIT_PRICE_ERROR)
  }
  return body
}

/**
 * Misma regla para card, detalle, chat y carga masiva:
 * nuevas = min(pedida, stock); el POST envía existente + nuevas.
 */
export function planCartAdd({
  idProducto,
  requestedQty,
  stock,
  existingQty = 0,
  precioUnitario,
} = {}) {
  const stockNum = Math.max(0, Number(stock) || 0)
  const requested = Math.max(0, Number(requestedQty) || 0)
  const existing = Math.max(0, Number(existingQty) || 0)
  const orderQty = Math.min(requested, stockNum)
  const id = toCartProductId(idProducto)

  if (!Number.isFinite(id)) {
    return { ok: false, reason: 'id_producto inválido', orderQty: 0, body: null }
  }
  if (orderQty <= 0) {
    return { ok: false, reason: 'Sin stock disponible', orderQty: 0, body: null }
  }
  const unitPrice = toCartUnitPrice(precioUnitario)
  if (!(unitPrice > 0)) {
    return { ok: false, reason: CART_UNIT_PRICE_ERROR, orderQty: 0, body: null }
  }

  return {
    ok: true,
    orderQty,
    body: buildCartPostBody({
      idProducto: id,
      cantidad: existing + orderQty,
      precioUnitario: unitPrice,
    }),
  }
}
