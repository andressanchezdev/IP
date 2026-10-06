/**
 * Modelo único de stock por bodega y ubicación (GET de productos, WS y carrito).
 * Sin imports con alias: se prueba con node --test.
 *
 * Forma de entrada (GET `stock` o WS `listado`):
 *   { "6": [ { ubicacion: "ZR", cantidad: 0, cantidadAux: 0 },
 *            { ubicacion: "01-C16", cantidad: 29, cantidadAux: 29 } ], "1": [...] }
 *
 *   cantidad    = existencia real de la ubicación.
 *   cantidadAux = cómo la ve el socket en tiempo real (disponible). Es lo que se muestra y vende.
 *
 * Forma interna (`stockDetail`):
 *   { "6": { real: 29, available: 29, locations: [{ ubicacion, cantidad, cantidadAux }] } }
 */

/** Bodega 0 / "0" se trata como "6" (misma regla que el WS). */
export const ZERO_WAREHOUSE_ID = '6'
/** Clave para stock sin información de bodega (número o lista plana). */
export const FLAT_WAREHOUSE_KEY = '*'

export function normalizeStockWarehouseKey(value) {
  if (value == null || value === '') return null
  const key = String(value).trim()
  if (!key) return null
  return key === '0' ? ZERO_WAREHOUSE_ID : key
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return trimmed
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

function toQty(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

function normalizeLocation(entry) {
  if (typeof entry === 'number' || (typeof entry === 'string' && entry.trim() && !Number.isNaN(Number(entry)))) {
    const qty = toQty(entry)
    return { ubicacion: '', cantidad: qty, cantidadAux: qty }
  }
  if (!entry || typeof entry !== 'object') return null
  if (!hasValue(entry.cantidad) && !hasValue(entry.cantidadAux)) return null

  const aux = hasValue(entry.cantidadAux) ? toQty(entry.cantidadAux) : toQty(entry.cantidad)
  const real = hasValue(entry.cantidad) ? toQty(entry.cantidad) : aux
  return {
    ubicacion: String(entry.ubicacion ?? entry.ubic ?? '').trim(),
    cantidad: real,
    cantidadAux: aux,
  }
}

function toEntryList(value) {
  const list = Array.isArray(value) ? value : [value]
  return list.map(normalizeLocation).filter(Boolean)
}

function buildBucket(locations) {
  return {
    real: locations.reduce((sum, location) => sum + location.cantidad, 0),
    available: locations.reduce((sum, location) => sum + location.cantidadAux, 0),
    locations,
  }
}

/** ¿Es un solo registro { cantidad, cantidadAux } y no un mapa de bodegas? */
function looksLikeSingleEntry(object) {
  return 'cantidad' in object || 'cantidadAux' in object
}

/**
 * Cualquier forma de stock → `stockDetail`, o null si no trae información usable.
 * Bodegas repetidas (p. ej. "0" y "6") se unen.
 */
export function parseStockDetail(raw) {
  const parsed = parseMaybeJson(raw)
  if (parsed == null || parsed === '') return null

  const grouped = new Map()
  const add = (key, locations) => {
    if (locations.length === 0) return
    grouped.set(key, [...(grouped.get(key) ?? []), ...locations])
  }

  if (Array.isArray(parsed) || typeof parsed === 'number' || typeof parsed === 'string') {
    add(FLAT_WAREHOUSE_KEY, toEntryList(parsed))
  } else if (typeof parsed === 'object') {
    if (looksLikeSingleEntry(parsed)) {
      add(FLAT_WAREHOUSE_KEY, toEntryList(parsed))
    } else {
      Object.keys(parsed).forEach((rawKey) => {
        const key = normalizeStockWarehouseKey(rawKey)
        if (!key) return
        add(key, toEntryList(parseMaybeJson(parsed[rawKey])))
      })
    }
  }

  if (grouped.size === 0) return null
  const detail = {}
  grouped.forEach((locations, key) => {
    detail[key] = buildBucket(locations)
  })
  return detail
}

/** El detalle trae al menos una bodega real (no solo stock plano). */
export function hasWarehouseKeys(detail) {
  return Boolean(detail) && Object.keys(detail).some((key) => key !== FLAT_WAREHOUSE_KEY)
}

/**
 * Stock que ve el cliente.
 * - Con bodega de perfil: solo esa bodega (si el producto no está ahí → 0).
 * - Sin bodega de perfil: suma de todas.
 * - Stock plano (sin bodegas): se usa tal cual.
 */
export function summarizeStockDetail(detail, warehouseId = null) {
  if (!detail) {
    return { available: 0, real: 0, warehouseId: null, scope: 'ninguno' }
  }
  if (!hasWarehouseKeys(detail)) {
    const flat = detail[FLAT_WAREHOUSE_KEY]
    return { available: flat?.available ?? 0, real: flat?.real ?? 0, warehouseId: null, scope: 'plano' }
  }

  const wid = normalizeStockWarehouseKey(warehouseId)
  if (wid) {
    const bucket = detail[wid]
    return { available: bucket?.available ?? 0, real: bucket?.real ?? 0, warehouseId: wid, scope: 'bodega' }
  }

  const buckets = Object.keys(detail)
    .filter((key) => key !== FLAT_WAREHOUSE_KEY)
    .map((key) => detail[key])
  return {
    available: buckets.reduce((sum, bucket) => sum + bucket.available, 0),
    real: buckets.reduce((sum, bucket) => sum + bucket.real, 0),
    warehouseId: null,
    scope: 'todas',
  }
}

/** Mapa simple { bodega: disponible } para código que aún lo consume. */
export function toStockByWarehouse(detail) {
  const result = {}
  Object.keys(detail ?? {}).forEach((key) => {
    if (key !== FLAT_WAREHOUSE_KEY) result[key] = detail[key].available
  })
  return result
}

/** Campos de stock que se guardan en el producto / ítem de carrito. */
export function buildStockFields(raw, warehouseId = null) {
  const detail = parseStockDetail(raw)
  const summary = summarizeStockDetail(detail, warehouseId)
  return {
    stock: summary.available,
    stockReal: summary.real,
    stockDetail: detail,
    stockByWarehouse: toStockByWarehouse(detail),
    stockScope: summary.scope,
    stockWarehouseId: summary.warehouseId,
  }
}

/** El mensaje WS es la foto completa de las bodegas que trae: reemplaza esas y conserva el resto. */
export function mergeStockDetail(previous, incoming) {
  if (!incoming) return previous ?? null
  const base = { ...previous }
  if (hasWarehouseKeys(incoming)) delete base[FLAT_WAREHOUSE_KEY]
  return { ...base, ...incoming }
}

/** Producto/ítem con el detalle nuevo ya mezclado y `stock` recalculado. */
export function patchStockFields(item, incomingDetail, warehouseId = null) {
  const merged = mergeStockDetail(item?.stockDetail, incomingDetail)
  const summary = summarizeStockDetail(merged, warehouseId)
  return {
    ...item,
    stock: summary.available,
    stockReal: summary.real,
    stockDetail: merged,
    stockByWarehouse: toStockByWarehouse(merged),
    stockScope: summary.scope,
    stockWarehouseId: summary.warehouseId,
    stockUpdatedAt: Date.now(),
  }
}

/** Aplica el detalle WS al producto `productId` de una lista; devuelve la misma lista si no hay cambio. */
export function patchStockInList(list, productId, incomingDetail, warehouseId = null) {
  if (!Array.isArray(list) || !incomingDetail) return list
  const id = String(productId ?? '').trim()
  if (!id) return list

  let changed = false
  const next = list.map((item) => {
    if (String(item?.id) !== id) return item
    changed = true
    return patchStockFields(item, incomingDetail, warehouseId)
  })
  return changed ? next : list
}

/**
 * Productos recién leídos del API (`freshById`: id → producto con `stockDetail`) → parchea el stock
 * de los que ya están en `list`. Devuelve la MISMA lista (y los mismos objetos) si nada cambió,
 * para no re-renderizar tarjetas sin necesidad.
 */
export function patchStockFromFresh(list, freshById, warehouseId = null) {
  if (!Array.isArray(list) || list.length === 0 || !freshById || freshById.size === 0) return list

  let changed = false
  const next = list.map((item) => {
    const fresh = freshById.get(String(item?.id ?? ''))
    if (!fresh?.stockDetail) return item

    const patched = patchStockFields(item, fresh.stockDetail, warehouseId)
    if (
      patched.stock === item.stock
      && patched.stockReal === item.stockReal
      && JSON.stringify(patched.stockDetail) === JSON.stringify(item.stockDetail)
    ) {
      return item
    }
    changed = true
    return patched
  })
  return changed ? next : list
}

/** Recalcula `stock` desde `stockDetail` cuando cambia la bodega del cliente. */
export function reapplyStockScopeInList(list, warehouseId = null) {
  if (!Array.isArray(list) || list.length === 0) return list

  let changed = false
  const next = list.map((item) => {
    if (!item?.stockDetail) return item
    const summary = summarizeStockDetail(item.stockDetail, warehouseId)
    if (
      summary.available === item.stock
      && summary.scope === item.stockScope
      && summary.warehouseId === item.stockWarehouseId
    ) {
      return item
    }
    changed = true
    return {
      ...item,
      stock: summary.available,
      stockReal: summary.real,
      stockScope: summary.scope,
      stockWarehouseId: summary.warehouseId,
    }
  })
  return changed ? next : list
}
