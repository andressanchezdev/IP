import { apiRequest } from '@/shared/api'
import { toMoneyNumber, wait } from './bulkShared'

export { CART_POST_CONCURRENCY, postBulkOrderToCart } from './bulkCartPost'

/** Lotes de consulta a inventory/products para no saturar la API. */
export const STOCK_BATCH_SIZE = 20
/** Ventana de ritmo: 20 peticiones repartidas en 15s (~750ms entre cada una). */
export const STOCK_BATCH_WINDOW_MS = 15_000

export const STOCK_STATUS = {
  OK: 'Ok',
  SHORT: 'con novedad',
  OUT: 'agotado',
}

function extractProducts(payload) {
  const data = payload?.data ?? payload
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.productos)) return data.productos
  if (Array.isArray(data?.products)) return data.products
  return []
}

async function fetchStockForCode(codigo) {
  const code = String(codigo ?? '').trim()
  if (!code) {
    return { codigo: '', stock: 0, id: null, precio: 0 }
  }

  const codeKey = code.toLowerCase()

  try {
    // Búsqueda por texto; luego se exige match exacto de `codigo`.
    // No usar products?codigo= ni productos[0]: la API puede devolver
    // la primera página del catálogo y repetir el mismo id_producto.
    const payload = await apiRequest(
      `/api/v1/inventory/products/search?search=${encodeURIComponent(code)}`,
      { method: 'GET' },
    )
    const productos = extractProducts(payload)
    const match = productos.find(
      (product) => String(product?.codigo ?? '').trim().toLowerCase() === codeKey,
    )

    if (!match) {
      return { codigo: code, stock: 0, id: null, precio: 0 }
    }

    return {
      codigo: code,
      stock: Math.max(0, Number(match.stock) || 0),
      id: match.id != null ? String(match.id) : null,
      precio: toMoneyNumber(match.precio),
    }
  } catch (error) {
    if (error?.name === 'ApiError' && error.status === 404) {
      return { codigo: code, stock: 0, id: null, precio: 0 }
    }
    throw error
  }
}

/**
 * Consulta stock por código con ritmo controlado:
 * cada bloque de hasta 20 códigos se reparte en 15s (proporcional si hay menos).
 * Actualiza `onProgress(done, total)` tras cada petición para la barra del botón.
 */
export async function fetchStockByCodes(
  codes,
  {
    batchSize = STOCK_BATCH_SIZE,
    batchWindowMs = STOCK_BATCH_WINDOW_MS,
    onProgress,
  } = {},
) {
  const list = Array.isArray(codes) ? codes : []
  const stockByCode = new Map()
  let processed = 0
  const size = Math.max(1, Number(batchSize) || STOCK_BATCH_SIZE)
  const windowMs = Math.max(0, Number(batchWindowMs) || STOCK_BATCH_WINDOW_MS)

  onProgress?.(0, list.length)

  for (let i = 0; i < list.length; i += size) {
    const batch = list.slice(i, i + size)
    const batchDurationMs = Math.round((batch.length / size) * windowMs)
    const stepMs = batch.length > 0
      ? Math.floor(batchDurationMs / batch.length)
      : 0

    for (let j = 0; j < batch.length; j += 1) {
      const startedAt = Date.now()
      const { codigo, stock, id, precio } = await fetchStockForCode(batch[j])
      stockByCode.set(codigo, { stock, id, precio })

      processed += 1
      onProgress?.(processed, list.length)

      if (j < batch.length - 1) {
        const elapsed = Date.now() - startedAt
        await wait(Math.max(0, stepMs - elapsed))
      }
    }
  }

  return stockByCode
}

/**
 * Compara pedido vs stock:
 * stock >= cantidad → Ok · 0 < stock < cantidad → con novedad · stock 0 → agotado.
 */
export function compareOrderWithStock(items = [], stockByCode = new Map()) {
  const results = items.map((item) => {
    const codigo = String(item?.codigo ?? '')
    const cantidad = Number(item?.cantidad) || 0
    const entry = stockByCode.get(codigo)
    const stock = typeof entry === 'number' ? entry : (entry?.stock ?? 0)
    const id = typeof entry === 'object' && entry ? entry.id : null
    const precio = typeof entry === 'object' && entry ? toMoneyNumber(entry.precio) : 0

    let estado = STOCK_STATUS.OK
    if (stock <= 0) {
      estado = STOCK_STATUS.OUT
    } else if (stock < cantidad) {
      estado = STOCK_STATUS.SHORT
    }

    return { codigo, cantidad, stock, estado, id, precio }
  })

  return {
    results,
    summary: {
      ok: results.filter((row) => row.estado === STOCK_STATUS.OK).length,
      novedad: results.filter((row) => row.estado === STOCK_STATUS.SHORT).length,
      agotado: results.filter((row) => row.estado === STOCK_STATUS.OUT).length,
    },
  }
}

/**
 * Continuar → Ok + con novedad (excluye agotado).
 * Continuar sin novedad → solo Ok.
 */
export function selectRowsForCart(results = [], { onlyOk = false } = {}) {
  const rows = Array.isArray(results) ? results : []
  if (onlyOk) {
    return rows.filter((row) => row.estado === STOCK_STATUS.OK)
  }
  return rows.filter((row) => row.estado !== STOCK_STATUS.OUT)
}

/**
 * Filas que no se envían y deben quedar en Informacion.
 */
export function selectRowsExcludedFromCart(results = [], { onlyOk = false } = {}) {
  const rows = Array.isArray(results) ? results : []
  if (onlyOk) {
    return rows.filter((row) => row.estado !== STOCK_STATUS.OK)
  }
  return rows.filter((row) => row.estado === STOCK_STATUS.OUT)
}
