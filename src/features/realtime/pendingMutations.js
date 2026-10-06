import { REALTIME_TYPES, resolveOrderFlowTipo } from '../../shared/realtime/messageTypes.js'

const MAX_PENDING = 200
let seq = 0
/** @type {Array<Record<string, unknown>>} */
const records = []
const stats = {
  noted: 0,
  confirmed: 0,
  received: 0,
  applied: 0,
  ignored: 0,
}

let sessionUserId = null

export function setRealtimeSessionUser(userId) {
  sessionUserId = userId == null || userId === '' ? null : String(userId)
}

export function getRealtimeSessionUser() {
  return sessionUserId
}

function text(value) {
  return String(value ?? '').trim()
}

function productIdOf(message) {
  return text(
    message?.idProducto
    ?? message?.carrito?.id_producto
    ?? message?.carritoList?.[0]?.id_producto,
  )
}

function eventUser(message) {
  return text(message?.carrito?.id_usuario ?? message?.carritoList?.[0]?.id_usuario ?? message?.id_usuario)
}

/**
 * El 2xx no abre el socket: lo deja apuntado para que el evento correspondiente lo confirme.
 * No dispara ninguna lectura HTTP.
 */
export function noteRealtimeMutation({
  action,
  productId = null,
  cartId = null,
  userId = null,
  warehouseId = null,
  quantity = null,
  orderId = null,
} = {}) {
  const record = {
    id: ++seq,
    action: text(action),
    productId: text(productId) || null,
    cartId: cartId ?? null,
    userId: text(userId || sessionUserId) || null,
    warehouseId: warehouseId ?? null,
    quantity: quantity ?? null,
    orderId: text(orderId) || null,
    at: Date.now(),
    status: 'pending',
    confirmedAt: null,
  }
  records.push(record)
  stats.noted += 1
  while (records.length > MAX_PENDING) records.shift()
  return record
}

function matches(record, message) {
  const tipo = text(message?.tipo)
  const productId = productIdOf(message)
  const owner = eventUser(message)
  const sameProduct = !record.productId || record.productId === productId
  const sameOwner = !owner || !record.userId || owner === text(record.userId)

  if (record.action === 'post' || record.action === 'put') {
    return tipo === REALTIME_TYPES.STOCK_CART && sameProduct && sameOwner
  }
  if (record.action === 'delete') {
    return tipo === REALTIME_TYPES.STOCK_DELETE && sameProduct && sameOwner
  }
  if (record.action === 'delete-massive') {
    return tipo === REALTIME_TYPES.STOCK_DELETE_ALL && sameOwner
  }
  if (record.action === 'sale') {
    return Boolean(resolveOrderFlowTipo(tipo))
  }
  return false
}

/** Cierra la mutación 2xx más antigua que este evento explica. */
export function confirmRealtimeMutation(message) {
  const found = records.find((record) => record.status === 'pending' && matches(record, message))
  if (!found) return null
  found.status = 'confirmed'
  found.confirmedAt = Date.now()
  stats.confirmed += 1
  return found
}

export function countRealtimeMessage(applied) {
  stats.received += 1
  if (applied) stats.applied += 1
  else stats.ignored += 1
}

export function getRealtimeDiagnostics() {
  return {
    sessionUserId,
    pending: records.filter((record) => record.status === 'pending').map((record) => ({ ...record })),
    recent: records.slice(-12).map((record) => ({ ...record })),
    mutations: { ...stats },
  }
}

export function resetRealtimeMutations() {
  records.length = 0
  seq = 0
  sessionUserId = null
  Object.keys(stats).forEach((key) => {
    stats[key] = 0
  })
}
