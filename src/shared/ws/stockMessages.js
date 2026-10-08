import {
  FLAT_WAREHOUSE_KEY,
  ZERO_WAREHOUSE_ID, // [WS-HOY 2026-10-08] para tratar la bodega "0" como "6" en findWarehouseRows
  normalizeStockWarehouseKey,
} from '@/shared/lib/stockDetail'
import { getSessionWarehouseId } from '@/shared/lib/sessionWarehouse'

function parseListing(value) {
  if (typeof value === 'string') {
    try {
      return parseListing(JSON.parse(value))
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const listing = {}
  for (const [key, rows] of Object.entries(value)) {
    if (!Array.isArray(rows)) continue
    listing[key] = rows.map((row) => (row && typeof row === 'object' ? { ...row } : row))
  }
  if (Object.keys(listing).length) return listing

  const internal = {}
  for (const [warehouseId, bucket] of Object.entries(value)) {
    if (Array.isArray(bucket?.locations)) {
      internal[warehouseId] = bucket.locations.map((row) => ({ ...row }))
    }
  }
  return Object.keys(internal).length ? internal : null
}

function listingString(value) {
  if (value == null || value === '' || typeof value === 'number' || typeof value === 'boolean') return null
  const parsed = parseListing(value)
  if (!parsed) return null
  const warehouses = Object.fromEntries(
    Object.entries(parsed).filter(([key]) => key !== FLAT_WAREHOUSE_KEY),
  )
  return Object.keys(warehouses).length ? JSON.stringify(warehouses) : null
}

function asListadoText(value) {
  if (value == null || value === '') return null
  const normalized = typeof value === 'string' ? listingString(value.trim()) : listingString(value)
  if (normalized) return normalized
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'object') return JSON.stringify(value)
  return null
}

function ubicacionEntries(source, found = [], depth = 0, seen = new Set()) {
  if (source == null || depth > 6) return found
  if (typeof source === 'string') {
    const trimmed = source.trim()
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return found
    try {
      return ubicacionEntries(JSON.parse(trimmed), found, depth + 1, seen)
    } catch {
      return found
    }
  }
  if (typeof source !== 'object' || seen.has(source)) return found
  seen.add(source)
  if (Array.isArray(source)) {
    source.forEach((item) => ubicacionEntries(item, found, depth + 1, seen))
    return found
  }
  for (const key of ['ubicacion_array', 'ubicacionArray']) {
    const listado = asListadoText(source[key])
    if (!listado) continue
    found.push({
      productId: source.id_producto ?? source.idProducto ?? source.id ?? null,
      listado,
    })
  }
  for (const [key, value] of Object.entries(source)) {
    if (key === 'ubicacion_array' || key === 'ubicacionArray') continue
    if (value && typeof value === 'object') ubicacionEntries(value, found, depth + 1, seen)
  }
  return found
}

function listadoForProduct(productId, ...sources) {
  const entries = sources.flatMap((source) => ubicacionEntries(source))
  if (entries.length === 0) return null
  const id = String(productId ?? '').trim()
  const match = id
    ? entries.find((entry) => String(entry.productId ?? '') === id)
    : null
  return (match ?? entries[0]).listado
}

export function deleteAllListings(message) {
  const direct = listingString(message?.listado)
  if (direct) {
    const rows = Array.isArray(message?.carrito) ? message.carrito : []
    const productId = rows.length === 1
      ? rows[0]?.id_producto ?? rows[0]?.idProducto
      : message?.idProducto
    return productId == null ? [] : [{ productId, listado: direct }]
  }
  if (typeof message?.listado !== 'string') return []
  try {
    const parsed = JSON.parse(message.listado)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return []
    return Object.entries(parsed)
      .map(([productId, value]) => ({ productId, listado: listingString(value) }))
      .filter((entry) => entry.listado)
  } catch {
    return []
  }
}

export function warehouseListing(...values) {
  for (const value of values) {
    if (listingString(value)) return value
  }
  return undefined
}

export function stockListingFromProduct(product) {
  for (const rawValue of [
    product?.stockData,
    product?.stockDetail,
    product?.stock,
    product?.apiData?.stock,
    product?.apiData?.stockData,
    product?.apiData?.listado,
  ]) {
    const raw = parseListing(rawValue)
    if (raw) return raw
  }

  return null
}

export function restoreStockForDeleteAll(product, warehouseId, quantity) {
  const listing = stockListingFromProduct(product)
  const key = normalizeStockWarehouseKey(warehouseId)
  const rows = listing?.[key]
  let remaining = Number(quantity)
  if (!Array.isArray(rows) || !Number.isFinite(remaining) || remaining <= 0) return null

  const orderedRows = rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => Number(String(a.row.ubicacion).toUpperCase() === 'ZR')
      - Number(String(b.row.ubicacion).toUpperCase() === 'ZR'))

  for (const { row } of orderedRows) {
    if (remaining <= 0) break
    const physical = Number(row.cantidad)
    if (!Number.isFinite(physical)) continue
    const current = Math.min(physical, available(row))
    const restored = Math.min(remaining, physical - current)
    if (restored <= 0) continue
    row.cantidadAux = current + restored
    remaining -= restored
  }

  return listing
}

function available(row) {
  const quantity = Number(row?.cantidadAux ?? row?.cantidad)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0
}

function listingFromProduct(product) {
  const listing = stockListingFromProduct(product)
  return listing ? listingString(listing) : null
}

/** Suma la cantidad que sale del carrito a `cantidadAux` de la bodega de la sesión. */
export function releaseCartQuantity(listadoText, cart) {
  const listing = parseListing(listadoText)
  const quantity = Number(cart?.cantidad)
  if (!listing || !Number.isFinite(quantity) || quantity <= 0) return listadoText ?? null

  const key = [getSessionWarehouseId(), normalizeStockWarehouseKey(cart?.id_bodega)]
    .find((candidate) => candidate && Array.isArray(listing[candidate]) && listing[candidate].length)
  const rows = key ? listing[key] : null
  if (!Array.isArray(rows) || rows.length === 0) return JSON.stringify(listing)

  let remaining = quantity
  const ordered = rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => Number(String(a.row.ubicacion).toUpperCase() === 'ZR')
      - Number(String(b.row.ubicacion).toUpperCase() === 'ZR'))

  for (const { row } of ordered) {
    if (remaining <= 0) break
    const physical = Number(row.cantidad)
    const current = Number(row.cantidadAux)
    const aux = Number.isFinite(current) ? current : 0
    if (!Number.isFinite(physical) || aux >= physical) continue
    const add = Math.min(remaining, physical - aux)
    row.cantidadAux = aux + add
    remaining -= add
  }

  if (remaining > 0) {
    const target = ordered.find(({ row }) => String(row.ubicacion).toUpperCase() === 'ZR')?.row
      ?? ordered[0]?.row
    if (target) {
      const current = Number(target.cantidadAux)
      target.cantidadAux = (Number.isFinite(current) ? current : 0) + remaining
    }
  }
  return JSON.stringify(listing)
}

/** Resta la cantidad que otro usuario ordenó, sin bajar de 0. */
export function reserveSessionQuantity(listadoText, quantity, warehouseId) {
  const listing = parseListing(listadoText)
  const amount = Number(quantity)
  if (!listing || !Number.isFinite(amount) || amount <= 0) return null

  const key = [getSessionWarehouseId(), normalizeStockWarehouseKey(warehouseId)]
    .find((candidate) => candidate && Array.isArray(listing[candidate]) && listing[candidate].length)
  const rows = key ? listing[key] : null
  if (!Array.isArray(rows) || rows.length === 0) return JSON.stringify(listing)

  let remaining = amount
  const ordered = [...rows].sort((a, b) => Number(String(a.ubicacion).toUpperCase() === 'ZR')
    - Number(String(b.ubicacion).toUpperCase() === 'ZR'))

  for (const row of ordered) {
    if (remaining <= 0) break
    const current = Number(row.cantidadAux)
    const aux = Number.isFinite(current) && current > 0 ? current : 0
    if (aux <= 0) continue
    const take = Math.min(remaining, aux)
    row.cantidadAux = aux - take
    remaining -= take
  }

  return JSON.stringify(listing)
}

function buildFailure(reason) {
  return { message: null, reason }
}

function buildCartStockMessage({ tipo, response, cart }) {
  if (!cart || typeof cart !== 'object' || cart.id_producto == null) {
    return buildFailure('la respuesta no trae la línea de carrito (id_producto)')
  }

  const idProducto = response?.idProducto ?? response?.id_producto ?? cart.id_producto
  const listado = listadoForProduct(idProducto, response, cart)
  if (!listado) {
    console.error(`[ws] ${tipo} sin ubicacion_array`, idProducto)
  }
  return {
    message: {
      tipo,
      idProducto,
      ...(listado ? { listado } : {}),
      carrito: { ...cart },
    },
    reason: null,
  }
}

export function buildStockCartMessage({ response, cart }) {
  return buildCartStockMessage({ tipo: 'stock carrito', response, cart })
}

export function buildStockDeleteMessage({ response, cart, product }) {
  const built = buildCartStockMessage({ tipo: 'stock eliminar', response, cart })
  if (!built.message) return built
  const base = built.message.listado
    ?? listingFromProduct(product)
    ?? listingFromProduct(cart)
  const listado = base
    ? releaseCartQuantity(base, { ...cart, cantidad: product?.quantity ?? cart.cantidad })
    : null
  return {
    message: {
      ...built.message,
      ...(listado ? { listado } : {}),
    },
    reason: null,
  }
}

export function buildStockDeleteAllMessages(cartItems = [], response = null) {
  const lines = cartItems
    .map((item) => item?.apiData)
    .filter((line) => line && typeof line === 'object' && line.id_producto != null)
  if (lines.length === 0) {
    return buildFailure('no hay líneas de la respuesta del carrito para stock eliminarTodo')
  }
  const messages = cartItems.flatMap((item) => {
    const line = item?.apiData
    if (!line || line.id_producto == null) return []
    const idProducto = line.id_producto
    const base = listadoForProduct(idProducto, response, line, item)
      ?? listingFromProduct(item)
    if (!base) {
      console.error('[ws] stock eliminarTodo sin ubicacion_array', idProducto)
    }
    const listado = base
      ? releaseCartQuantity(base, { ...line, cantidad: item.quantity ?? line.cantidad })
      : null
    return [{
      tipo: 'stock eliminarTodo',
      idProducto,
      ...(listado ? { listado } : {}),
      carrito: { ...line },
    }]
  })
  return { messages, message: messages[0], reason: null }
}

export function getStockListingFromMessage(message) {
  if (message?.tipo === 'nuevoControl' && ['stock', 'ubic'].includes(message?.info?.control)) {
    return {
      productId: message.idProducto,
      listado: message.info?.lista ?? message.lista,
    }
  }
  if ([
    'stock carrito',
    'stock carrito aumentado',
    'stock carrito eliminar',
    'stock eliminar',
    'stock eliminarTodo',
  ].includes(message?.tipo)) {
    const productId = message.idProducto ?? message.carrito?.id_producto
    if (message.tipo === 'stock eliminarTodo' && (productId == null || message.listado == null)) return null
    return { productId, listado: message.listado }
  }
  return null
}

// [WS-HOY 2026-10-08] INICIO: findWarehouseRows + applyAuxIncreaseFromZero (agregadas hoy).
/**
 * Filas de la bodega de la sesión dentro de un listado.
 * La bodega "6" también puede venir como "0" (ver normalizeStockWarehouseKey).
 * Devuelve la clave tal como está escrita en el listado para poder escribir de vuelta.
 */
function findWarehouseRows(listing, warehouseId) {
  const key = normalizeStockWarehouseKey(warehouseId)
  if (!listing || !key) return null
  const candidates = key === ZERO_WAREHOUSE_ID ? [key, '0'] : [key]
  for (const candidate of candidates) {
    if (Array.isArray(listing[candidate])) return { key: candidate, rows: listing[candidate] }
  }
  return null
}

/**
 * Card con 0 disponible en la bodega de la sesión y el socket trae aumento:
 * copia solo `cantidadAux` en las ubicaciones que coinciden. Devuelve el listado
 * nuevo (string) o null si no aplica; en ese caso manda el listado del mensaje.
 */
export function applyAuxIncreaseFromZero(currentRaw, incomingRaw, warehouseId) {
  const current = parseListing(currentRaw)
  const incoming = parseListing(incomingRaw)
  const currentBucket = findWarehouseRows(current, warehouseId)
  const incomingBucket = findWarehouseRows(incoming, warehouseId)
  if (!currentBucket || !incomingBucket) return null

  const currentAvailable = currentBucket.rows.reduce((sum, row) => {
    const aux = Number(row?.cantidadAux)
    return sum + (Number.isFinite(aux) && aux > 0 ? aux : 0)
  }, 0)
  if (currentAvailable > 0) return null

  let changed = false
  const nextRows = currentBucket.rows.map((row) => {
    const ubicacion = String(row?.ubicacion ?? '').trim().toUpperCase()
    const match = incomingBucket.rows.find((candidate) =>
      String(candidate?.ubicacion ?? '').trim().toUpperCase() === ubicacion,
    )
    const nextAux = Number(match?.cantidadAux)
    if (!match || !Number.isFinite(nextAux) || nextAux <= 0) return row

    changed = true
    return { ...row, cantidadAux: nextAux }
  })

  if (!changed) return null
  return JSON.stringify({ ...current, [currentBucket.key]: nextRows })
}
// [WS-HOY 2026-10-08] FIN: findWarehouseRows + applyAuxIncreaseFromZero.
