import { ZERO_WAREHOUSE_FALLBACK_ID } from './config'

function parseMaybeJson(value, fallback) {
  if (value == null || value === '') {
    return fallback
  }

  if (typeof value === 'object') {
    return value
  }

  if (typeof value !== 'string') {
    return fallback
  }

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

/**
 * Único ajuste de bodega: 0 / "0" → "6".
 * Cualquier otro valor se respeta tal cual.
 */
export function normalizeWarehouseId(idBodega) {
  if (idBodega === 0 || idBodega === '0') {
    return ZERO_WAREHOUSE_FALLBACK_ID
  }

  if (idBodega == null || idBodega === '') {
    return null
  }

  return String(idBodega)
}

function firstCartEntry(carrito) {
  if (Array.isArray(carrito)) {
    return carrito[0] && typeof carrito[0] === 'object' ? carrito[0] : null
  }
  if (carrito && typeof carrito === 'object') {
    return carrito
  }
  return null
}

function resolveRawWarehouseId(payload, cartEntry) {
  if (payload?.idBodega != null && payload.idBodega !== '') {
    return payload.idBodega
  }

  if (cartEntry?.id_bodega != null && cartEntry.id_bodega !== '') {
    return cartEntry.id_bodega
  }

  if (payload?.idBodegaAux != null && payload.idBodegaAux !== '') {
    return payload.idBodegaAux
  }

  return null
}

/**
 * Normaliza un mensaje crudo del WebSocket a la estructura observada en producción.
 * Claves típicas: tipo, idProducto, idBodega, listado, carrito|carrito[],
 * cuerpo, idCajero, idVenta, cajas, productos, lista, metodo, info...
 */
export function normalizeWsMessage(rawData) {
  if (rawData == null || rawData === 'undefined') {
    return null
  }

  let payload = rawData

  if (typeof rawData === 'string') {
    const trimmed = rawData.trim()
    if (!trimmed || trimmed === 'undefined') {
      return null
    }
    payload = parseMaybeJson(trimmed, null)
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }

  const tipo = String(payload.tipo ?? '').trim()
  if (!tipo) {
    return null
  }

  const carritoRaw = payload.carrito ?? null
  const carritoList = Array.isArray(carritoRaw)
    ? carritoRaw.filter((item) => item && typeof item === 'object')
    : []
  const carrito = Array.isArray(carritoRaw)
    ? null
    : (carritoRaw && typeof carritoRaw === 'object' ? carritoRaw : null)
  const cartEntry = firstCartEntry(carritoRaw)

  const rawWarehouseId = resolveRawWarehouseId(payload, cartEntry)
  const idBodega = normalizeWarehouseId(rawWarehouseId)
  const listado = payload.listado != null
    ? parseMaybeJson(payload.listado, payload.listado)
    : null
  const lista = payload.lista != null
    ? parseMaybeJson(payload.lista, payload.lista)
    : null

  return {
    ...payload,
    tipo,
    idBodega,
    idBodegaRaw: rawWarehouseId,
    idBodegaAux: payload.idBodegaAux != null
      ? normalizeWarehouseId(payload.idBodegaAux)
      : null,
    listado,
    lista,
    idProducto: payload.idProducto ?? cartEntry?.id_producto ?? null,
    idVenta: payload.idVenta ?? null,
    cuerpo: payload.cuerpo ?? null,
    idCajero: payload.idCajero ?? null,
    idVendedor: payload.idVendedor ?? null,
    metodo: payload.metodo ?? null,
    cantidad: payload.cantidad ?? cartEntry?.cantidad ?? null,
    previousQty: payload.previousQty ?? null,
    cajas: Array.isArray(payload.cajas) ? payload.cajas : [],
    productos: Array.isArray(payload.productos) ? payload.productos : [],
    info: payload.info && typeof payload.info === 'object' ? payload.info : null,
    carrito,
    carritoList,
  }
}
