import {
  resolveOrderFlowTipo,
  WS_MESSAGE_TYPES,
} from '@/shared/ws/config'
import {
  getCurrentFlowLabel,
  resolveOrderStepFromEstado,
  resolveOrderStepFromWsTipo,
} from '@/features/orders/constants/orderSteps'

function text(value) {
  return String(value ?? '').trim()
}

function pickOrderId(message) {
  const pedido = message?.contenido
  const candidates = [
    message?.cuerpo,
    message?.idVenta,
    message?.id_venta,
    pedido?.idVenta,
    pedido?.id_venta,
    pedido?.idventa,
    message?.idPedido,
    message?.id_pedido,
    message?.venta?.id_venta,
  ]

  const found = candidates.find((value) => value != null && String(value).trim() !== '')
  return found != null ? String(found).trim() : null
}

function orderMatches(order, orderId) {
  return String(order.id) === orderId || String(order.idventa) === orderId
}

/**
 * WS de flujo de pedido → actualiza `status` de la card en Historial.
 * No toca stock ni carrito.
 */
function patchOrderList(setOrders, orderId, patch) {
  if (typeof setOrders !== 'function') {
    return false
  }

  let updated = false
  setOrders((current) => {
    if (!Array.isArray(current) || current.length === 0) {
      return current
    }

    let changed = false
    const next = current.map((order) => {
      if (!orderMatches(order, orderId)) {
        return order
      }
      const patched = patch(order)
      if (patched === order) {
        return order
      }
      changed = true
      return patched
    })

    updated = changed
    return changed ? next : current
  })

  return updated
}

/**
 * WS de flujo de pedido → actualiza `status` de la card en Historial.
 * `packing` con cajas pasa a facturación y guarda el embalaje.
 * `despacho pedido` usa `contenido.idVenta`.
 * No toca stock ni carrito.
 */
export function applyOrderFlowFromWsMessage(message, {
  setPendingOrders,
  setHistoryOrders,
} = {}) {
  const tipo = text(message?.tipo)
  const flowTipo = resolveOrderFlowTipo(tipo)
  if (!flowTipo) {
    return { action: 'ignorado', tipo }
  }

  if (typeof setPendingOrders !== 'function' && typeof setHistoryOrders !== 'function') {
    return { action: 'sin setter', tipo }
  }

  const orderId = pickOrderId(message)
  if (!orderId) {
    return { action: 'sin id', tipo }
  }

  const hasCajas = flowTipo === WS_MESSAGE_TYPES.PACKING
    && Array.isArray(message?.cajas)
    && message.cajas.length > 0
  const isDespachoPedido = tipo.split(/\s+/)[1] === 'pedido' && flowTipo === WS_MESSAGE_TYPES.DESPACHO
  const nextStatus = hasCajas
    ? resolveOrderStepFromEstado('facturacion')
    : resolveOrderStepFromWsTipo(flowTipo)

  const patch = (order) => {
    const nextEstado = hasCajas
      ? 'facturacion'
      : (flowTipo === WS_MESSAGE_TYPES.TOMA_PEDIDO
        ? 'verificacion'
        : (isDespachoPedido ? 'despacho' : text(message?.estado) || order.estado))
    const statusSame = order.status === nextStatus
    const estadoSame = order.estado === nextEstado
    const embalajeSame = !hasCajas
      || JSON.stringify(order.embalaje ?? null) === JSON.stringify(message.cajas)
    if (statusSame && estadoSame && embalajeSame) {
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
    estado: hasCajas ? 'facturacion' : (isDespachoPedido ? 'despacho' : flowTipo),
  }
}
