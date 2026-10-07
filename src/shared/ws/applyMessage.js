import { getSessionWarehouseId } from '@/shared/lib/sessionWarehouse'
import { buildStockFields } from '@/shared/lib/stockDetail'
import { getWebSocketStateSlot, getWebSocketStateValue } from './stateSlots'
import { WS_PRODUCT_EVENTS, isProductStockMessage } from './messageTypes'
import { getStockListingFromMessage, restoreStockForDeleteAll } from './stockMessages'

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
        if (text(item?.id) !== text(productId)) return item
        changed = true
        return { ...item, ...stockFields, stockData: listado }
      })
      return changed ? next : items
    })
  }
}

function applyStock(message) {
  const snapshot = getStockListingFromMessage(message)
  if (snapshot) {
    applyStockSnapshot(snapshot.productId, snapshot.listado)
    return
  }
  if (message.tipo !== WS_PRODUCT_EVENTS.STOCK_DELETE_ALL) return

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

function applyCart(message, userId) {
  const setCart = getWebSocketStateSlot('cart')
  if (typeof setCart !== 'function' || !userId) return
  const lines = cartRows(message)

  if (message.tipo === WS_PRODUCT_EVENTS.STOCK_CART) {
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

  if (message.tipo === WS_PRODUCT_EVENTS.STOCK_DELETE) {
    const cartId = text(message.idCarrito)
    const productId = text(message.idProducto)
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
