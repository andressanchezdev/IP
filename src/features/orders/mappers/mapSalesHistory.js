import {
  getCurrentFlowLabel,
  getOrderStepIndex,
  isCreditoMetodoPago,
  mapEstadoFacturaLabel,
  resolveOrderStepFromEstado,
} from '@/features/orders/constants/orderSteps'
import {
  resolvePaymentDeadline,
  resolvePaymentLimitDays,
} from '@/features/orders/utils/resolvePaymentDeadline'

function toSafeNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function toHistoryItems(venta = []) {
  if (!Array.isArray(venta)) {
    return []
  }

  return venta.map((item, index) => {
    const idpr = item?.idpr ?? null
    const cant = toSafeNumber(item?.cant, 0)
    const costo = toSafeNumber(item?.costo, 0)
    const rel = toSafeNumber(item?.rel, 0)

    return {
      idpr,
      cant,
      rel,
      costo,
      id: String(idpr ?? `pr-${index}`),
      quantity: cant,
      price: costo,
      description: `Producto #${idpr ?? index + 1}`,
      reference: idpr != null ? String(idpr) : '',
    }
  })
}

export function mapSaleToHistoryOrder(entry) {
  const idventa = toSafeNumber(entry?.id_venta, 0)
  const venta = toHistoryItems(entry?.venta)
  const metodo_pago = String(entry?.metodo_pago ?? '').trim()
  const estado = String(entry?.estado ?? '').trim()
  const fecha = entry?.fecha ?? ''
  const total = toSafeNumber(entry?.total, 0)
  const pagos = Array.isArray(entry?.pagos) ? entry.pagos : []
  const estado_factura = entry?.estado_factura ?? null
  const status = resolveOrderStepFromEstado(estado)
  const stepIndex = getOrderStepIndex(estado)
  const paymentLimitDays = resolvePaymentLimitDays(entry)
  const deadline = resolvePaymentDeadline({
    createdAt: fecha,
    paymentLimitDays,
  })

  return {
    idventa,
    id: String(idventa || ''),
    estado,
    estado_factura,
    estadoFacturaLabel: mapEstadoFacturaLabel(estado_factura),
    fecha,
    createdAt: fecha,
    metodo_pago,
    total,
    pagos,
    venta,
    items: venta,
    status,
    stepIndex,
    statusLabel: getCurrentFlowLabel(estado),
    paymentLimitDays: deadline.days,
    dateLimit: deadline.deadlineIso,
    dateLimitLabel: deadline.dateLimitLabel,
  }
}

export function mapSalesToHistoryOrders(data = []) {
  if (!Array.isArray(data)) {
    return []
  }
  return data.map(mapSaleToHistoryOrder)
}

/** Pedidos de Cartera: solo crédito. */
export function mapSalesToCreditHistoryOrders(data = []) {
  return mapSalesToHistoryOrders(data).filter((order) => isCreditoMetodoPago(order.metodo_pago))
}

export function mapSaleToPendingOrder(entry) {
  const history = mapSaleToHistoryOrder(entry)
  const paymentType = String(history.metodo_pago || 'efectivo').toLowerCase()
  const resolvedType = paymentType.includes('credito')
    ? 'credito'
    : paymentType.includes('transfer')
      ? 'transferencia'
      : paymentType.includes('efectivo')
        ? 'efectivo'
        : paymentType

  return {
    ...history,
    paymentMethod: history.metodo_pago,
    payment: {
      type: resolvedType,
      method: history.metodo_pago,
      amount: history.total,
      paidAmount: 0,
      payments: [],
      deadline: history.dateLimit,
      details: {
        paymentLimitDays: history.paymentLimitDays,
      },
      checkoutDetails: {
        paymentLimitDays: history.paymentLimitDays,
      },
    },
    dateLimit: history.dateLimitLabel,
  }
}

export function mapSalesToPendingOrders(data = []) {
  if (!Array.isArray(data)) {
    return []
  }
  return data.map(mapSaleToPendingOrder)
}
