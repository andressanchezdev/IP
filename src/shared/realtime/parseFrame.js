import { normalizeStockWarehouseKey } from '../lib/stockDetail.js'

function parseMaybeJson(value, fallback) {
  if (value == null || value === '') return fallback
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function firstCartEntry(carrito) {
  if (Array.isArray(carrito)) {
    return carrito.find((item) => item && typeof item === 'object') ?? null
  }
  if (carrito && typeof carrito === 'object') return carrito
  return null
}

/**
 * Bodega del evento (quién reservó), nunca la bodega que se pinta.
 * `id_bodega_aux` no participa: en el protocolo real no decide el stock mostrado.
 */
function eventWarehouseId(payload, cartEntry) {
  if (payload?.idBodega != null && payload.idBodega !== '') return payload.idBodega
  if (cartEntry?.id_bodega != null && cartEntry.id_bodega !== '') return cartEntry.id_bodega
  return null
}

function normalizePayload(rawData) {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) return null
  const tipo = String(rawData.tipo ?? '').trim()
  if (!tipo) return null

  const carritoRaw = rawData.carrito ?? null
  const carritoList = Array.isArray(carritoRaw)
    ? carritoRaw.filter((item) => item && typeof item === 'object')
    : []
  const carrito = Array.isArray(carritoRaw)
    ? null
    : (carritoRaw && typeof carritoRaw === 'object' ? carritoRaw : null)
  const cartEntry = firstCartEntry(carritoRaw)
  const rawWarehouseId = eventWarehouseId(rawData, cartEntry)
  const info = rawData.info && typeof rawData.info === 'object' && !Array.isArray(rawData.info)
    ? {
      ...rawData.info,
      lista: rawData.info.lista != null ? parseMaybeJson(rawData.info.lista, rawData.info.lista) : null,
    }
    : null
  const contenido = rawData.contenido && typeof rawData.contenido === 'object'
    ? rawData.contenido
    : parseMaybeJson(rawData.contenido, null)

  return {
    ...rawData,
    tipo,
    idBodega: normalizeStockWarehouseKey(rawWarehouseId),
    idBodegaRaw: rawWarehouseId,
    listado: rawData.listado != null ? parseMaybeJson(rawData.listado, rawData.listado) : null,
    lista: rawData.lista != null ? parseMaybeJson(rawData.lista, rawData.lista) : null,
    idProducto: rawData.idProducto ?? cartEntry?.id_producto ?? null,
    info,
    contenido: contenido && typeof contenido === 'object' && !Array.isArray(contenido) ? contenido : null,
    carrito,
    carritoList,
    productos: Array.isArray(rawData.productos) ? rawData.productos : [],
    cajas: Array.isArray(rawData.cajas) ? rawData.cajas : [],
  }
}

const EMPTY_FRAME_TEXTS = new Set(['', 'undefined', 'null', '{}', '[]'])
const HEARTBEAT_FRAME_TEXTS = new Set(['ping', 'pong', 'heartbeat', 'keepalive'])
const CONTROL_FRAME_TYPES = new Set(['connected', 'connection', 'welcome', 'hello', 'ack', 'ping', 'pong', 'heartbeat'])
const WRAPPER_KEYS = ['data', 'message', 'mensaje', 'payload', 'body']
const MAX_UNWRAP_DEPTH = 4

function decodeBinaryFrame(rawData) {
  if (typeof TextDecoder === 'undefined') return null
  if (rawData instanceof ArrayBuffer) return new TextDecoder().decode(rawData)
  if (ArrayBuffer.isView(rawData)) return new TextDecoder().decode(rawData)
  return null
}

/**
 * Frame crudo → mensajes de negocio.
 * `ignored`: vacío, "undefined" o saludo `{"type":"connected"}`. No es un error.
 */
export function parseRealtimeFrame(rawData) {
  const result = { messages: [], ignored: null, errors: [] }
  let sawEmpty = false
  let sawHeartbeat = false

  const visit = (value, depth) => {
    if (value == null) {
      sawEmpty = true
      return
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      const lower = trimmed.toLowerCase()
      if (EMPTY_FRAME_TEXTS.has(lower)) {
        sawEmpty = true
        return
      }
      if (HEARTBEAT_FRAME_TEXTS.has(lower)) {
        sawHeartbeat = true
        return
      }
      if (depth >= MAX_UNWRAP_DEPTH) {
        result.errors.push({ reason: 'json_demasiado_anidado', preview: trimmed.slice(0, 200) })
        return
      }
      try {
        visit(JSON.parse(trimmed), depth + 1)
      } catch (error) {
        result.errors.push({
          reason: 'json_invalido',
          preview: trimmed.slice(0, 200),
          error: error?.message || String(error),
        })
      }
      return
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        sawEmpty = true
        return
      }
      value.forEach((item) => visit(item, depth + 1))
      return
    }
    if (typeof value === 'object') {
      const binary = decodeBinaryFrame(value)
      if (binary != null) {
        visit(binary, depth + 1)
        return
      }
      if (typeof Blob !== 'undefined' && value instanceof Blob) {
        result.errors.push({ reason: 'blob_sin_decodificar', size: value.size })
        return
      }
      if (String(value.tipo ?? '').trim()) {
        const message = normalizePayload(value)
        if (message) result.messages.push(message)
        return
      }
      if (CONTROL_FRAME_TYPES.has(String(value.type ?? '').trim().toLowerCase())) {
        sawHeartbeat = true
        return
      }
      const wrapperKey = WRAPPER_KEYS.find((key) => value[key] != null && value[key] !== '')
      if (wrapperKey && depth < MAX_UNWRAP_DEPTH) {
        visit(value[wrapperKey], depth + 1)
        return
      }
      if (Object.keys(value).length === 0) {
        sawEmpty = true
        return
      }
      result.errors.push({ reason: 'sin_campo_tipo', keys: Object.keys(value).slice(0, 12) })
      return
    }
    result.errors.push({ reason: 'tipo_raw_no_soportado', rawType: typeof value })
  }

  visit(rawData, 0)
  if (result.messages.length === 0 && result.errors.length === 0) {
    result.ignored = sawHeartbeat && !sawEmpty ? 'latido' : 'vacio'
  }
  return result
}
