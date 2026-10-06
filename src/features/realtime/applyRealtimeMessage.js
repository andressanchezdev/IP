import { getSessionWarehouseId } from '@/shared/lib/sessionWarehouse'
import {
  hasWarehouseKeys,
  parseStockDetail,
  patchStockInList,
} from '@/shared/lib/stockDetail'
import { applyAbonoFromWsMessage, readAbonoCredit } from './applyAbonoEvent'
import { applyCatalogNoticeFromWs } from './applyCatalogNotice'
import { applyOrderEvent } from './applyOrderEvent'
import {
  confirmRealtimeMutation,
  countRealtimeMessage,
  getRealtimeSessionUser,
} from './pendingMutations'
import { applyCartPlan, planCartFromEvent } from './reduceCartEvent'
import { collectStockSnapshots } from './reduceStockEvent'
import { getRealtimeSlot } from './slots'
import { rememberStockSnapshot } from './stockMemory'

const PRODUCT_SLOTS = ['products', 'search', 'latest', 'filtered', 'cart']

function text(value) {
  return String(value ?? '').trim()
}

/**
 * Un mensaje del socket → stock, carrito, pedidos y crédito.
 * No llama al API. El 2xx correspondiente queda confirmado si el evento coincide.
 */
export function applyRealtimeMessage(message) {
  let applied = false
  const warehouseId = getSessionWarehouseId()

  collectStockSnapshots(message).forEach(({ productId, listado }) => {
    const detail = parseStockDetail(listado)
    if (!detail || !hasWarehouseKeys(detail)) return
    rememberStockSnapshot(productId, detail)
    const patch = (current) => patchStockInList(current, productId, detail, warehouseId)
    PRODUCT_SLOTS.forEach((name) => {
      const setList = getRealtimeSlot(name)
      if (typeof setList === 'function') setList(patch)
    })
    applied = true
  })

  const head = text(message?.tipo).split(/\s+/)[0]
  const control = text(message?.info?.control)
  if (head === 'nuevoControl' && control !== 'stock' && control !== 'ubic') {
    const notice = applyCatalogNoticeFromWs(message, {
      setProducts: getRealtimeSlot('products'),
      setSearchProducts: getRealtimeSlot('search'),
      setLatestProducts: getRealtimeSlot('latest'),
    })
    if (notice?.updatedIds?.length) applied = true
  }

  const userId = getRealtimeSessionUser()
  const setCart = getRealtimeSlot('cart')
  const tipo = text(message?.tipo)
  const movesCart = tipo === 'stock carrito' || tipo === 'stock eliminar' || tipo === 'stock eliminarTodo'
  if (movesCart && typeof setCart === 'function' && userId) {
    setCart((current) => {
      const next = applyCartPlan(current, planCartFromEvent(message, { userId, cartItems: current }))
      if (next !== current) applied = true
      return next
    })
  }

  const order = applyOrderEvent(message, {
    setPendingOrders: getRealtimeSlot('pendingOrders'),
    setHistoryOrders: getRealtimeSlot('historyOrders'),
  })
  if (order?.action === 'status actualizado') applied = true

  const abono = applyAbonoFromWsMessage(message, {
    userId,
    setPendingOrders: getRealtimeSlot('pendingOrders'),
    setHistoryOrders: getRealtimeSlot('historyOrders'),
  })
  if (abono?.action === 'abono actualizado' || abono?.action === 'abono ingresado') applied = true

  const credit = readAbonoCredit(message, userId)
  const setCredit = getRealtimeSlot('credit')
  if (credit != null && typeof setCredit === 'function') {
    setCredit(credit)
    applied = true
  }

  if (confirmRealtimeMutation(message)) applied = true
  countRealtimeMessage(applied)
  return { applied, tipo: message?.tipo ?? '' }
}
