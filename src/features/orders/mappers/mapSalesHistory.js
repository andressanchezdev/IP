import {
  getCurrentFlowLabel,
  getOrderStepIndex,
  isCreditoMetodoPago,
  mapEstadoFacturaLabel,
  resolveOrderStepFromEstado,
} from '@/features/orders/constants/orderSteps'
import {
  resolvePaymentDeadline,
  resolvePaymentDeadlineFromDate,
  resolvePaymentLimitDays,
} from '@/features/orders/utils/resolvePaymentDeadline'

function toSafeNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

/** Acepta array, JSON string o un solo objeto de línea. */
function coerceLineArray(raw) {
  if (Array.isArray(raw)) {
    return raw
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) {
      return []
    }
    try {
      const parsed = JSON.parse(trimmed)
      return coerceLineArray(parsed)
    } catch {
      return []
    }
  }
  if (raw && typeof raw === 'object') {
    if (
      raw.idpr != null
      || raw.id_producto != null
      || raw.idProducto != null
      || raw.codigo != null
    ) {
      return [raw]
    }
  }
  return []
}

/**
 * Líneas de producto de una venta API.
 * El backend ha usado `venta`, y a veces `productos` / `detalle` / `items`.
 */
function pickSaleLines(entry) {
  const candidates = [
    entry?.venta,
    entry?.productos,
    entry?.detalle,
    entry?.detalle_venta,
    entry?.items,
    entry?.lines,
  ]
  for (const candidate of candidates) {
    const lines = coerceLineArray(candidate)
    if (lines.length > 0) {
      return lines
    }
  }
  return []
}

function toHistoryItems(rawLines = []) {
  const lines = coerceLineArray(rawLines)
  if (lines.length === 0) {
    return []
  }

  return lines.map((item, index) => {
    const idpr = item?.idpr ?? item?.id_producto ?? item?.idProducto ?? item?.id ?? null
    const cant = toSafeNumber(item?.cant ?? item?.cantidad ?? item?.quantity, 0)
    const costo = toSafeNumber(
      item?.costo ?? item?.precio ?? item?.precio_unitario ?? item?.price,
      0,
    )
    const rel = toSafeNumber(item?.rel, 0)
    const description = String(
      item?.description
      ?? item?.descripcion
      ?? item?.nombre
      ?? '',
    ).trim() || `Producto #${idpr ?? index + 1}`
    const reference = String(
      item?.reference ?? item?.codigo ?? item?.referencia ?? idpr ?? '',
    ).trim()

    return {
      idpr,
      cant,
      rel,
      costo,
      id: String(idpr ?? `pr-${index}`),
      quantity: cant,
      price: costo,
      description,
      reference,
      category: String(item?.category ?? item?.categoria ?? '').trim(),
      brand: String(item?.brand ?? item?.marca ?? '').trim(),
      model: String(item?.model ?? item?.modelo ?? '').trim(),
      imageUrl: String(
        item?.imageUrl
        ?? item?.imagen
        ?? item?.imagen_producto
        ?? '',
      ).trim(),
      brandLogo: String(item?.brandLogo ?? item?.brandLogoUrl ?? item?.imagen_marca ?? '').trim(),
    }
  })
}

export function mapSaleToHistoryOrder(entry) {
  const idventa = toSafeNumber(entry?.id_venta, 0)
  const claveVenta = String(entry?.clave_venta ?? '').trim()
  const venta = toHistoryItems(pickSaleLines(entry))
  const metodo_pago = String(entry?.metodo_pago ?? '').trim()
  const estado = String(entry?.estado ?? '').trim()
  const fecha = entry?.fecha ?? ''
  const total = toSafeNumber(entry?.total, 0)
  const pagos = Array.isArray(entry?.pagos) ? entry.pagos : []
  const estado_factura = entry?.estado_factura ?? null
  const status = resolveOrderStepFromEstado(estado)
  const stepIndex = getOrderStepIndex(estado)
  const paymentLimitDays = resolvePaymentLimitDays(entry)
  // Cartera: Fecha límite desde sales.credito.fecha; fallback = creación + dias.
  const creditoFecha = entry?.credito?.fecha
  const deadline = creditoFecha
    ? resolvePaymentDeadlineFromDate({
      deadlineAt: creditoFecha,
      paymentLimitDays,
    })
    : resolvePaymentDeadline({
      createdAt: fecha,
      paymentLimitDays,
    })

  return {
    idventa,
    clave_venta: claveVenta,
    claveVenta,
    id: claveVenta || String(idventa || ''),
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

/** Pedidos de Cartera: solo crédito, con payment listo para abonos locales. */
export function mapSalesToCreditHistoryOrders(data = []) {
  return mapSalesToHistoryOrders(data)
    .filter((order) => isCreditoMetodoPago(order.metodo_pago))
    .map((order) => ({
      ...order,
      paymentMethod: order.metodo_pago,
      payment: {
        type: 'credito',
        method: order.metodo_pago,
        amount: order.total,
        paidAmount: 0,
        payments: [],
        deadline: order.dateLimit,
        details: { paymentLimitDays: order.paymentLimitDays },
        checkoutDetails: { paymentLimitDays: order.paymentLimitDays },
      },
    }))
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
