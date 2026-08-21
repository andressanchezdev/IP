import {
  isOrderFlowWsTipo,
  WS_MESSAGE_TYPES,
} from '@/shared/ws/config'
import { resolveOrderStepFromWsTipo } from '@/features/orders/constants/orderSteps'

function text(value) {
  return String(value ?? '').trim()
}

function pickOrderId(message) {
  const candidates = [
    message?.cuerpo,
    message?.idVenta,
    message?.id_venta,
    message?.idPedido,
    message?.id_pedido,
    message?.venta?.id_venta,
  ]

  const found = candidates.find((value) => value != null && String(value).trim() !== '')
  return found != null ? String(found).trim() : null
}

/**
 * WS de flujo de pedido → actualiza `status` de la card en Historial.
 * No toca stock ni carrito.
 */
export function applyOrderFlowFromWsMessage(message, { setPendingOrders } = {}) {
  const tipo = text(message?.tipo)
  if (!tipo || !isOrderFlowWsTipo(tipo)) {
    return { action: 'ignorado', tipo }
  }

  if (typeof setPendingOrders !== 'function') {
    return { action: 'sin setter', tipo }
  }

  const orderId = pickOrderId(message)
  if (!orderId) {
    return { action: 'sin id', tipo }
  }

  const nextStatus = resolveOrderStepFromWsTipo(tipo)
  let updated = false

  setPendingOrders((current) => {
    if (!Array.isArray(current) || current.length === 0) {
      return current
    }

    let changed = false
    const next = current.map((order) => {
      const matches = String(order.id) === orderId
        || String(order.idventa) === orderId
      if (!matches || order.status === nextStatus) {
        return order
      }
      changed = true
      return {
        ...order,
        status: nextStatus,
        estado: tipo === WS_MESSAGE_TYPES.TOMA_PEDIDO ? 'verificacion' : text(message?.estado) || order.estado,
      }
    })

    updated = changed
    return changed ? next : current
  })

  return {
    action: updated ? 'status actualizado' : 'sin cambio',
    tipo,
    orderId,
    status: nextStatus,
  }
}
