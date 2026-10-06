import {
  ABONO_STATUS,
  sumVerifiedAbonos,
} from '@/features/orders/constants/abonoStatus'

function text(value) {
  return String(value ?? '').trim()
}

function wsHead(tipo) {
  return text(tipo).split(/\s+/)[0]
}

export function mapAbonoEstadoPago(value) {
  const raw = text(value).toLowerCase()
  if (raw === 'pendiente' || raw === 'revision' || raw === 'en revision') {
    return ABONO_STATUS.REVISION
  }
  if (raw === 'verificado') {
    return ABONO_STATUS.VERIFICADO
  }
  if (raw === 'novedad') {
    return ABONO_STATUS.NOVEDAD
  }
  return ''
}

export function readAbonoCredit(message, userId) {
  if (wsHead(message?.tipo) !== 'abonoData') {
    return null
  }
  if (text(message?.id_usuario) !== text(userId)) {
    return null
  }
  if (text(message?.metodo).toLowerCase() !== 'ingreso') {
    return null
  }

  const credito = message?.info?.usuario?.credito
  if (typeof credito === 'number' && Number.isFinite(credito)) {
    return credito
  }
  if (typeof credito === 'string' && credito.trim() && Number.isFinite(Number(credito))) {
    return Number(credito)
  }
  if (credito && typeof credito === 'object') {
    const amount = Number(credito.disponible ?? credito.available ?? credito.credito)
    return Number.isFinite(amount) ? amount : null
  }
  return null
}

function abonoList(message) {
  const abono = message?.info?.abono
  if (Array.isArray(abono)) {
    return abono.filter((entry) => entry && typeof entry === 'object')
  }
  if (abono && typeof abono === 'object') {
    return [abono]
  }
  return []
}

function paymentMatches(entry, idPago) {
  const key = text(idPago)
  if (!key) {
    return false
  }
  return [entry?.id_pago, entry?.id, entry?.details?.id_pago]
    .some((value) => text(value) === key)
}

function orderIdOf(entry) {
  return text(entry?.id_venta ?? entry?.idVenta ?? entry?.idventa)
}

/**
 * `abonoData actualizar` cambia estado_pago del abono ya guardado en el pedido.
 * `abonoData ingreso` agrega el abono al pedido si trae id_venta.
 */
export function applyAbonoFromWsMessage(message, {
  userId,
  setPendingOrders,
  setHistoryOrders,
} = {}) {
  if (wsHead(message?.tipo) !== 'abonoData') {
    return { action: 'ignorado' }
  }
  if (text(message?.id_usuario) !== text(userId)) {
    return { action: 'otro usuario' }
  }

  const metodo = text(message?.metodo).toLowerCase()
  if (metodo === 'actualizar') {
    const idPago = message?.id_pago ?? message?.info?.abono?.id_pago
    const nextStatus = mapAbonoEstadoPago(message?.info?.abono?.estado_pago)
    if (!text(idPago) || !nextStatus) {
      return { action: 'sin estado', metodo }
    }
    const updated = patchOrderPayments(setPendingOrders, idPago, nextStatus)
      || patchOrderPayments(setHistoryOrders, idPago, nextStatus)
    return {
      action: updated ? 'abono actualizado' : 'sin cambio',
      metodo,
      idPago: text(idPago),
      status: nextStatus,
    }
  }

  if (metodo === 'ingreso') {
    const added = abonoList(message).reduce((count, entry) => {
      const orderId = orderIdOf(entry)
      if (!orderId) {
        return count
      }
      const pendingAdded = appendAbono(setPendingOrders, orderId, entry)
      const historyAdded = pendingAdded ? false : appendAbono(setHistoryOrders, orderId, entry)
      return count + (pendingAdded || historyAdded ? 1 : 0)
    }, 0)
    return { action: added ? 'abono ingresado' : 'sin pedido', metodo }
  }

  return { action: 'ignorado', metodo }
}

function patchOrderPayments(setOrders, idPago, nextStatus) {
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
      const payments = order?.payment?.payments
      if (!Array.isArray(payments)) {
        return order
      }
      let found = false
      const nextPayments = payments.map((entry) => {
        if (!paymentMatches(entry, idPago) || entry.status === nextStatus) {
          return entry
        }
        found = true
        return {
          ...entry,
          id_pago: entry.id_pago ?? idPago,
          status: nextStatus,
          reviewedAt: new Date().toISOString(),
        }
      })
      if (!found) {
        return order
      }
      changed = true
      return {
        ...order,
        payment: {
          ...order.payment,
          payments: nextPayments,
          paymentsMade: nextPayments.length,
          paidAmount: sumVerifiedAbonos(nextPayments),
        },
      }
    })

    updated = changed
    return changed ? next : current
  })

  return updated
}

function appendAbono(setOrders, orderId, entry) {
  if (typeof setOrders !== 'function') {
    return false
  }

  const idPago = text(entry?.id_pago ?? entry?.id)
  let updated = false
  setOrders((current) => {
    if (!Array.isArray(current) || current.length === 0) {
      return current
    }

    let changed = false
    const next = current.map((order) => {
      const matches = text(order?.id) === orderId
        || text(order?.idventa) === orderId
      if (!matches) {
        return order
      }
      const payments = Array.isArray(order?.payment?.payments) ? order.payment.payments : []
      if (idPago && payments.some((payment) => paymentMatches(payment, idPago))) {
        return order
      }
      const amount = Number(entry?.valor ?? entry?.monto ?? entry?.amount)
      const abono = {
        id: idPago || `abono-ws-${Date.now()}`,
        id_pago: idPago || null,
        amount: Number.isFinite(amount) ? amount : 0,
        type: 'credito',
        status: mapAbonoEstadoPago(entry?.estado_pago) || ABONO_STATUS.REVISION,
        details: entry,
        createdAt: new Date().toISOString(),
      }
      const nextPayments = [...payments, abono]
      changed = true
      return {
        ...order,
        payment: {
          ...(order.payment ?? {}),
          type: order.payment?.type ?? 'credito',
          payments: nextPayments,
          paymentsMade: nextPayments.length,
          paidAmount: sumVerifiedAbonos(nextPayments),
        },
      }
    })

    updated = changed
    return changed ? next : current
  })

  return updated
}
