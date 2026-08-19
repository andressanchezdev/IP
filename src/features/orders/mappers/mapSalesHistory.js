function toSafeNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function mapEstadoToStepLabel(estado = '') {
  const normalized = String(estado).toLowerCase()
  if (normalized.includes('verif')) return 'Verificación exitosa'
  if (normalized.includes('pick')) return 'Picking exitoso'
  if (normalized.includes('pack')) return 'Packing exitoso'
  if (normalized.includes('fact')) return 'Facturación exitosa'
  if (normalized.includes('desp')) return 'Despacho'
  if (normalized.includes('envi')) return 'Enviado'
  return 'Verificación exitosa'
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
      id: `${idpr ?? 'pr'}-${index}`,
      quantity: cant,
      price: costo,
      description: `Producto #${idpr ?? index + 1}`,
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

  return {
    idventa,
    estado,
    estado_factura,
    fecha,
    metodo_pago,
    total,
    pagos,
    venta,
  }
}

export function mapSalesToHistoryOrders(data = []) {
  if (!Array.isArray(data)) {
    return []
  }
  return data.map(mapSaleToHistoryOrder)
}

export function mapSaleToPendingOrder(entry) {
  const history = mapSaleToHistoryOrder(entry)
  const id = String(history.idventa || '')
  const items = history.venta.map((item, index) => ({
    id: `${history.idventa}-${item.idpr ?? index}`,
    description: `Producto #${item.idpr ?? index + 1}`,
    quantity: item.cant,
    price: item.costo,
  }))

  return {
    ...history,
    id,
    createdAt: history.fecha,
    status: mapEstadoToStepLabel(history.estado),
    paymentMethod: history.metodo_pago,
    items,
    dateLimit: '-',
  }
}

export function mapSalesToPendingOrders(data = []) {
  if (!Array.isArray(data)) {
    return []
  }
  return data.map(mapSaleToPendingOrder)
}
