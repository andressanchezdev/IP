import { getSessionWarehouseId } from '@/shared/lib/sessionWarehouse'
import { buildStockFields } from '@/shared/lib/stockDetail'
import { getWebSocketStateSlot, getWebSocketStateValue } from './stateSlots'
import { WS_PRODUCT_EVENTS, isProductStockMessage } from './messageTypes'
import {
  deleteAllListings,
  getStockListingFromMessage,
  releaseCartQuantity,
  restoreStockForDeleteAll,
} from './stockMessages'

const restoredCartIds = new Set()

function text(value) {
  return String(value ?? '').trim()
}

function cartRows(message) {
  if (Array.isArray(message?.carritoList)) return message.carritoList
  if (Array.isArray(message?.carrito)) return message.carrito
  if (message?.carrito && typeof message.carrito === 'object') return [message.carrito]
  return []
}

function sameProduct(item, productId) {
  const target = text(productId)
  if (!target) return false
  return [item?.id, item?.id_producto, item?.idProducto].some((value) => {
    const current = text(value)
    if (!current) return false
    if (current === target) return true
    const left = Number(current)
    const right = Number(target)
    return Number.isFinite(left) && Number.isFinite(right) && left === right
  })
}

function orderLine(message) {
  const cart = message?.carrito
  if (cart && typeof cart === 'object' && !Array.isArray(cart)) return cart
  return null
}

/** El listado del mensaje manda. El stock ya pintado por GET /general no lo reemplaza ni lo bloquea. */
function listadoFromMessage(message, snapshot) {
  const line = orderLine(message)
  return snapshot?.listado ?? line?.ubicacion_array ?? line?.ubicacionArray ?? null
}

// [WS-HOY 2026-10-08] VERSIÓN ANTERIOR de applyStockSnapshot (referencia de la de las 7 a. m.).
// Reemplazaba el listado completo sin pasar por applyAuxIncreaseFromZero.
/*
function applyStockSnapshot(productId, listado) {
  if (!productId || listado == null) return
  const stockFields = buildStockFields(listado, getSessionWarehouseId())
  if (!stockFields.stockDetail) return

  for (const slotName of ['products', 'search', 'latest', 'filtered', 'cart']) {
    const setList = getWebSocketStateSlot(slotName)
    if (typeof setList !== 'function') continue
    setList((items) => {
      if (!Array.isArray(items)) return items
      let changed = false
      const next = items.map((item) => {
        if (!sameProduct(item, productId)) return item
        changed = true
        return { ...item, ...stockFields, stockData: listado }
      })
      return changed ? next : items
    })
  }
}
*/
// [WS-HOY 2026-10-08] applyStockSnapshot NUEVA: el listado del mensaje REEMPLAZA el stock de la card.
// stock = suma de cantidadAux del listado en la bodega de la sesión (buildStockFields). Antes se fusionaba
// con applyAuxIncreaseFromZero, pero esa fusión descartaba ubicaciones nuevas del mensaje (stock incorrecto).
function applyStockSnapshot(productId, listado) {
  if (!productId || listado == null) return
  const session = getSessionWarehouseId()
  const stockFields = buildStockFields(listado, session)
  if (!stockFields.stockDetail) return
  console.info('[ws:stock]', { productId, id_bodega: session, stock: stockFields.stock, stockScope: stockFields.stockScope, listado })

  for (const slotName of ['products', 'search', 'latest', 'filtered', 'cart']) {
    const setList = getWebSocketStateSlot(slotName)
    if (typeof setList !== 'function') continue
    setList((items) => {
      if (!Array.isArray(items)) return items
      let changed = false
      const next = items.map((item) => {
        if (!sameProduct(item, productId)) return item
        changed = true
        return { ...item, ...stockFields, stockData: listado }
      })
      console.info('[ws:stock aplicado]', { slotName, changed, stock: stockFields.stock })
      return changed ? next : items
    })
  }
}
function listadoForDelete(message, listado) {
  const isDelete = message?.tipo === WS_PRODUCT_EVENTS.STOCK_DELETE
    || message?.tipo === WS_PRODUCT_EVENTS.STOCK_DELETE_ALL
  if (!isDelete) return listado

  const available = buildStockFields(listado, getSessionWarehouseId()).stock
  if (available > 0) return listado

  const quantity = Number(message.carrito?.cantidad)
  if (!Number.isFinite(quantity) || quantity <= 0) return listado

  return releaseCartQuantity(listado, {
    cantidad: quantity,
    id_bodega: getSessionWarehouseId(),
  }) ?? listado
}

function applyStock(message) {
  const snapshot = getStockListingFromMessage(message)
  const listado = listadoFromMessage(message, snapshot)
  const productId = snapshot?.productId ?? orderLine(message)?.id_producto
  if (productId && listado != null) {
    applyStockSnapshot(productId, listadoForDelete(message, listado))
    return
  }
  if (
    message.tipo !== WS_PRODUCT_EVENTS.STOCK_DELETE_ALL
    && message.tipo !== WS_PRODUCT_EVENTS.STOCK_DELETE
  ) return

  // Respaldo: el listado ya se aplicó arriba cuando el mensaje trae idProducto + listado.
  // Aquí message.listado es un mapa de bodegas (usa idProducto) o un mapa por producto.
  const listings = deleteAllListings(message)
  if (listings.length > 0) {
    listings.forEach(({ productId, listado }) => applyStockSnapshot(productId, listado))
    return
  }

  const grouped = new Map()
  for (const line of cartRows(message)) {
    const productId = text(line?.id_producto)
    const warehouseId = text(line?.id_bodega)
    const quantity = Number(line?.cantidad)
    if (!productId || !warehouseId || !Number.isFinite(quantity) || quantity <= 0) continue
    const cartId = text(line?.id_carrito)
    if (cartId && restoredCartIds.has(cartId)) continue
    const key = `${productId}:${warehouseId}`
    const group = grouped.get(key) ?? { productId, warehouseId, quantity: 0, cartIds: [] }
    group.quantity += quantity
    if (cartId) group.cartIds.push(cartId)
    grouped.set(key, group)
  }

  for (const { productId, warehouseId, quantity, cartIds } of grouped.values()) {
    const product = ['products', 'search', 'latest', 'filtered', 'cart']
      .flatMap((slot) => getWebSocketStateValue(slot) ?? [])
      .find((item) => text(item?.id) === productId)
    if (!product) continue
    const listing = restoreStockForDeleteAll(product, warehouseId, quantity)
    if (!listing) continue
    applyStockSnapshot(productId, JSON.stringify(listing))
    cartIds.forEach((id) => restoredCartIds.add(id))
  }

  while (restoredCartIds.size > 1000) {
    restoredCartIds.delete(restoredCartIds.values().next().value)
  }
}

/** Actualiza la membresía del carrito de esta sesión. El stock de la tarjeta lo escribe applyStock. */
function applyCart(message, userId) {
  const setCart = getWebSocketStateSlot('cart')
  if (typeof setCart !== 'function' || !userId) return
  const lines = cartRows(message)

  if (
    message.tipo === WS_PRODUCT_EVENTS.STOCK_CART
    || message.tipo === WS_PRODUCT_EVENTS.STOCK_CART_INCREASED
  ) {
    // Entra o actualiza la línea solo si carrito.id_usuario es esta sesión.
    // Cantidad, id de carrito y precio salen de esa línea. Otro usuario no marca Ordenado.
    const line = lines.find((item) => text(item?.id_usuario) === text(userId))
    if (!line) return
    const id = text(line.id_producto ?? message.idProducto)
    if (!id) return
    const catalogProduct = [
      'products',
      'search',
      'latest',
      'filtered',
    ].flatMap((slot) => getWebSocketStateValue(slot) ?? [])
      .find((product) => text(product?.id) === id)
    setCart((current = []) => {
      const index = current.findIndex((item) => text(item.id) === id)
      const previous = index >= 0 ? current[index] : null
      const updated = {
        ...catalogProduct,
        ...previous,
        id,
        quantity: Math.max(1, Number(line.cantidad) || 1),
        cartId: line.id_carrito ?? previous?.cartId,
        userId: line.id_usuario,
        price: Number(line.precio_unitario ?? previous?.price) || 0,
        apiData: line,
      }
      if (index < 0) return [...current, updated]
      if (previous.quantity === updated.quantity && text(previous.cartId) === text(updated.cartId)) return current
      const next = current.slice()
      next[index] = updated
      return next
    })
    return
  }

  if (message.tipo === WS_PRODUCT_EVENTS.STOCK_CART_DELETE) {
    // Quita la línea de esta sesión por id_carrito o, si no viene, por id_producto.
    // Si id_usuario es de otro usuario, no toca este carrito.
    const line = lines.find((item) => text(item?.id_usuario) === text(userId)) ?? lines[0]
    const owner = text(line?.id_usuario)
    if (owner && owner !== text(userId)) return
    const productId = text(line?.id_producto ?? message.idProducto)
    const cartId = text(line?.id_carrito)
    if (!productId && !cartId) return
    setCart((current = []) => {
      const next = current.filter((item) => {
        if (cartId && text(item.cartId) === cartId) return false
        return text(item.id) !== productId
      })
      return next.length === current.length ? current : next
    })
    return
  }

  if (message.tipo === WS_PRODUCT_EVENTS.STOCK_DELETE) {
    // Quita la línea por idCarrito del mensaje (o carrito.id_carrito).
    // Sin id de carrito, la quita por idProducto. No cambia la cantidadAux: eso ya lo hizo applyStock con listado.
    const cartId = text(message.idCarrito ?? message.carrito?.id_carrito)
    const productId = text(message.idProducto ?? message.carrito?.id_producto)
    setCart((current = []) => {
      const next = current.filter((item) => {
        if (cartId) return text(item.cartId) !== cartId
        return text(item.id) !== productId
      })
      return next.length === current.length ? current : next
    })
    return
  }

  if (message.tipo === WS_PRODUCT_EVENTS.STOCK_DELETE_ALL) {
    // Vacía solo las líneas cuyo carrito.id_usuario es esta sesión.
    // Cada id_producto de esas líneas sale del carrito. El stock lo pinta el listado en applyStock.
    const productIds = new Set(
      lines
        .filter((line) => text(line.id_usuario) === text(userId))
        .map((line) => text(line.id_producto))
        .filter(Boolean),
    )
    if (productIds.size === 0) return
    setCart((current = []) => {
      const next = current.filter((item) => !productIds.has(text(item.id)))
      return next.length === current.length ? current : next
    })
  }
}

export function applyWebSocketMessage(message, userId) {
  if (!message || typeof message !== 'object' || !isProductStockMessage(message)) return
  applyStock(message)
  applyCart(message, userId)
}
