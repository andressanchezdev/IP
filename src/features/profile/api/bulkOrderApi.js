import { apiRequest } from '@/shared/api'

/** Lotes de consulta a inventory/products para no saturar la API. */
export const STOCK_BATCH_SIZE = 20

export const STOCK_STATUS = {
  OK: 'sin novedad',
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
  try {
    const payload = await apiRequest(
      `/api/v1/inventory/products?codigo=${encodeURIComponent(codigo)}`,
      { method: 'GET' },
    )
    const productos = extractProducts(payload)
    const match = productos.find(
      (product) => String(product?.codigo ?? '') === String(codigo),
    ) ?? productos[0]

    return { codigo: String(codigo), stock: Math.max(0, Number(match?.stock) || 0) }
  } catch (error) {
    // Producto inexistente: la API responde 404 → stock 0.
    if (error?.name === 'ApiError' && error.status === 404) {
      return { codigo: String(codigo), stock: 0 }
    }
    throw error
  }
}

/**
 * Consulta stock por código en lotes secuenciales (paralelo dentro del lote).
 * `onProgress(consultados, total)` alimenta la barra del botón.
 * Devuelve Map codigo → stock.
 */
export async function fetchStockByCodes(codes, { batchSize = STOCK_BATCH_SIZE, onProgress } = {}) {
  const list = Array.isArray(codes) ? codes : []
  const stockByCode = new Map()
  let processed = 0

  onProgress?.(0, list.length)

  for (let i = 0; i < list.length; i += batchSize) {
    const batch = list.slice(i, i + batchSize)
    const results = await Promise.all(batch.map((codigo) => fetchStockForCode(codigo)))

    results.forEach(({ codigo, stock }) => {
      stockByCode.set(codigo, stock)
    })

    processed += batch.length
    onProgress?.(Math.min(processed, list.length), list.length)
  }

  return stockByCode
}

/**
 * Compara cada { codigo, cantidad } del pedido contra el stock de la API:
 * stock >= cantidad → sin novedad · 0 < stock < cantidad → con novedad · stock 0 → agotado.
 */
export function compareOrderWithStock(items = [], stockByCode = new Map()) {
  const results = items.map((item) => {
    const codigo = String(item?.codigo ?? '')
    const cantidad = Number(item?.cantidad) || 0
    const stock = stockByCode.get(codigo) ?? 0

    let estado = STOCK_STATUS.OK
    if (stock <= 0) {
      estado = STOCK_STATUS.OUT
    } else if (stock < cantidad) {
      estado = STOCK_STATUS.SHORT
    }

    return { codigo, cantidad, stock, estado }
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
