import { apiRequest } from '@/shared/api'

function extractSales(payload) {
  const data = payload?.data ?? payload
  if (Array.isArray(data)) {
    return data
  }
  if (Array.isArray(data?.ventas)) {
    return data.ventas
  }
  if (Array.isArray(data?.sales)) {
    return data.sales
  }
  return []
}

/** Extrae la venta creada (objeto único o primer elemento del listado). */
function extractCreatedSale(payload) {
  const data = payload?.data ?? payload
  if (!data || typeof data !== 'object') {
    return null
  }
  if (Array.isArray(data)) {
    return data[0] ?? null
  }
  if (data.venta && typeof data.venta === 'object' && !Array.isArray(data.venta)) {
    return data.venta
  }
  if (data.id_venta != null || data.clave_venta != null || data.total != null) {
    return data
  }
  const list = extractSales(payload)
  return list[0] ?? null
}

/**
 * Fecha local en el formato del body de ventas: "YYYY-MM-DD HH:mm:ss"
 */
export function formatSalesFecha(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) {
    return formatSalesFecha(new Date())
  }
  const pad = (n) => String(n).padStart(2, '0')
  return [
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  ].join(' ')
}

export async function getManagementSales({ token, signal } = {}) {
  const payload = await apiRequest('/api/v1/managment/sales', {
    method: 'GET',
    token,
    signal,
  })

  return {
    data: extractSales(payload),
    meta: payload?.meta ?? {},
    raw: payload,
  }
}

/**
 * POST /api/v1/managment/sales
 * Crea el pedido a partir del carrito del usuario autenticado.
 *
 * Body:
 * {
 *   "metodo_pago": "credito",
 *   "direccion": "Calle 10 #20-30, Medellín",
 *   "fecha": "2026-09-24 16:40:00",
 *   "total": 56000.000
 * }
 */
export async function postManagementSales({
  token,
  metodoPago,
  direccion,
  total,
  fecha,
  signal,
} = {}) {
  const method = String(metodoPago ?? '').trim().toLowerCase()
  if (!method) {
    throw new Error('metodo_pago requerido')
  }

  const address = String(direccion ?? '').trim()
  if (!address) {
    throw new Error('direccion requerida')
  }

  const amount = Number(total)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('total inválido')
  }

  const body = {
    metodo_pago: method,
    direccion: address,
    fecha: fecha || formatSalesFecha(new Date()),
    total: amount,
  }

  const payload = await apiRequest('/api/v1/managment/sales', {
    method: 'POST',
    token,
    body,
    signal,
  })

  if (payload?.error) {
    throw new Error(payload.error)
  }

  return {
    sale: extractCreatedSale(payload),
    data: extractSales(payload),
    meta: payload?.meta ?? {},
    raw: payload,
    request: body,
  }
}
