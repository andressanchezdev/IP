import { REALTIME_TYPES } from '../../shared/realtime/messageTypes.js'

function text(value) {
  return String(value ?? '').trim()
}

function sameUser(left, right) {
  return text(left) !== '' && text(left) === text(right)
}

function linesOf(message) {
  if (Array.isArray(message?.carritoList) && message.carritoList.length > 0) return message.carritoList
  if (Array.isArray(message?.carrito)) {
    return message.carrito.filter((item) => item && typeof item === 'object')
  }
  if (message?.carrito && typeof message.carrito === 'object') return [message.carrito]
  return []
}

function rowFrom(line) {
  const id = text(line?.id_producto ?? line?.idProducto)
  if (!id) return null
  const quantity = Math.max(1, Math.floor(Number(line?.cantidad) || 1))
  const price = Number(line?.precio_unitario)
  return {
    id,
    quantity,
    cartId: line?.id_carrito ?? null,
    userId: line?.id_usuario ?? null,
    warehouseId: line?.id_bodega ?? null,
    price: Number.isFinite(price) ? price : 0,
  }
}

/**
 * Cambio de carrito que el propio payload autoriza (sin volver a pedir el carrito).
 * Solo toca líneas del usuario de la sesión. El stock viaja aparte, en `listado`.
 */
export function planCartFromEvent(message, { userId, cartItems = [] } = {}) {
  const empty = { upserts: [], removeIds: [] }
  const tipo = text(message?.tipo)
  if (!tipo || text(userId) === '') return empty

  const mine = linesOf(message).filter((line) => sameUser(line?.id_usuario, userId))
  const inCart = new Set((Array.isArray(cartItems) ? cartItems : []).map((item) => text(item?.id)))

  if (tipo === REALTIME_TYPES.STOCK_CART) {
    return { upserts: mine.map(rowFrom).filter(Boolean), removeIds: [] }
  }

  if (tipo === REALTIME_TYPES.STOCK_DELETE) {
    const owner = linesOf(message)[0]?.id_usuario
    const productId = text(message?.idProducto ?? linesOf(message)[0]?.id_producto)
    const ownedByOther = text(owner) !== '' && !sameUser(owner, userId)
    if (!productId || ownedByOther || !inCart.has(productId)) return empty
    return { upserts: [], removeIds: [productId] }
  }

  if (tipo === REALTIME_TYPES.STOCK_DELETE_ALL) {
    return {
      upserts: [],
      removeIds: mine.map((line) => text(line?.id_producto ?? line?.idProducto)).filter(Boolean),
    }
  }

  return empty
}

/** Aplica el plan. Devuelve la misma lista si nada cambió. */
export function applyCartPlan(cartItems, plan) {
  const current = Array.isArray(cartItems) ? cartItems : []
  const removeIds = new Set((plan?.removeIds ?? []).map(text).filter(Boolean))
  const upserts = plan?.upserts ?? []
  if (removeIds.size === 0 && upserts.length === 0) return current

  let next = current
  let changed = false

  if (removeIds.size > 0) {
    const filtered = next.filter((item) => !removeIds.has(text(item?.id)))
    if (filtered.length !== next.length) {
      next = filtered
      changed = true
    }
  }

  upserts.forEach((row) => {
    const index = next.findIndex((item) => text(item?.id) === row.id)
    if (index >= 0) {
      const prev = next[index]
      const sameQty = Number(prev.quantity) === row.quantity
      const sameCart = prev.cartId != null && text(prev.cartId) === text(row.cartId)
      if (sameQty && (sameCart || row.cartId == null)) return
      if (!changed) next = next.slice()
      changed = true
      next[index] = {
        ...prev,
        quantity: row.quantity,
        ...(row.cartId != null ? { cartId: row.cartId } : {}),
        userId: row.userId ?? prev.userId,
      }
      return
    }
    if (!changed) next = next.slice()
    changed = true
    next.push({
      id: row.id,
      quantity: row.quantity,
      cartId: row.cartId ?? undefined,
      userId: row.userId,
      price: row.price,
      precio: row.price,
    })
  })

  return changed ? next : current
}
