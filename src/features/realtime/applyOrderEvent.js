import { REALTIME_TYPES, resolveOrderFlowTipo } from '@/shared/realtime/messageTypes'
import {
  getCurrentFlowLabel,
  resolveOrderStepFromEstado,
} from '@/features/orders/constants/orderSteps'

function text(value) {
  return String(value ?? '').trim()
}

const FLOW_ESTADO = {
  [REALTIME_TYPES.TOMA_PEDIDO]: 'verificacion',
  [REALTIME_TYPES.PICKING]: 'picking',
  [REALTIME_TYPES.PICKING_CHANGE_CONFIRM]: 'picking',
  [REALTIME_TYPES.PACKING]: 'packing',
  [REALTIME_TYPES.VENTA]: 'facturacion',
  [REALTIME_TYPES.DESPACHO]: 'despacho',
  [REALTIME_TYPES.TRASLADO]: 'enviado',
}

function pickOrderId(message) {
  const pedido = message?.contenido
  const found = [
    message?.cuerpo,
    message?.idVenta,
    message?.id_venta,
    pedido?.idVenta,
    pedido?.id_venta,
    pedido?.idventa,
    message?.idPedido,
    message?.id_pedido,
    message?.venta?.id_venta,
  ].find((value) => value != null && text(value) !== '')
  return found != null ? text(found) : null
}

function orderMatches(order, orderId) {
  return text(order?.id) === orderId || text(order?.idventa) === orderId
}

function patchOrderList(setOrders, orderId, patch) {
  if (typeof setOrders !== 'function') return false
  let updated = false
  setOrders((current) => {
    if (!Array.isArray(current) || current.length === 0) return current
    let changed = false
    const next = current.map((order) => {
      if (!orderMatches(order, orderId)) return order
      const patched = patch(order)
      if (patched === order) return order
      changed = true
      return patched
    })
    updated = changed
    return changed ? next : current
  })
  return updated
}

/**
 * Evento de pedido → estado de la card. No toca stock ni carrito.
 */
export function applyOrderEvent(message, { setPendingOrders, setHistoryOrders } = {}) {
  const tipo = text(message?.tipo)
  const flowTipo = resolveOrderFlowTipo(tipo)
  if (!flowTipo) return { action: 'ignorado', tipo }
  if (typeof setPendingOrders !== 'function' && typeof setHistoryOrders !== 'function') {
    return { action: 'sin setter', tipo }
  }

  const orderId = pickOrderId(message)
  if (!orderId) return { action: 'sin id', tipo }

  const hasCajas = flowTipo === REALTIME_TYPES.PACKING
    && Array.isArray(message?.cajas)
    && message.cajas.length > 0
  const isDespachoPedido = tipo.split(/\s+/)[1] === 'pedido' && flowTipo === REALTIME_TYPES.DESPACHO
  const releasedTo = flowTipo === REALTIME_TYPES.LIBERAR_PEDIDO ? text(message?.estadoCambio) : ''
  if (flowTipo === REALTIME_TYPES.LIBERAR_PEDIDO && !releasedTo) {
    return { action: 'sin estadoCambio', tipo, orderId }
  }

  const nextStatus = hasCajas
    ? resolveOrderStepFromEstado('facturacion')
    : (releasedTo
      ? resolveOrderStepFromEstado(releasedTo)
      : resolveOrderStepFromEstado(FLOW_ESTADO[flowTipo] || flowTipo))

  const patch = (order) => {
    const nextEstado = hasCajas
      ? 'facturacion'
      : (releasedTo
        || (flowTipo === REALTIME_TYPES.TOMA_PEDIDO ? 'verificacion' : '')
        || (isDespachoPedido ? 'despacho' : text(message?.estado) || order.estado))
    if (order.status === nextStatus && order.estado === nextEstado && (!hasCajas || JSON.stringify(order.embalaje ?? null) === JSON.stringify(message.cajas))) {
      return order
    }
    return {
      ...order,
      status: nextStatus,
      estado: nextEstado || order.estado,
      processStatus: getCurrentFlowLabel(nextStatus),
      ...(hasCajas ? { embalaje: message.cajas } : {}),
    }
  }

  const updatedPending = patchOrderList(setPendingOrders, orderId, patch)
  const updatedHistory = patchOrderList(setHistoryOrders, orderId, patch)
  return {
    action: updatedPending || updatedHistory ? 'status actualizado' : 'sin cambio',
    tipo,
    orderId,
    status: nextStatus,
  }
}
