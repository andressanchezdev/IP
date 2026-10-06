import { getSessionWarehouseId } from '@/shared/lib/sessionWarehouse'
import { parseStockDetail, summarizeStockDetail } from '@/shared/lib/stockDetail'

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
 * Stock disponible (cantidadAux) de una bodega.
 * Sin `warehouseId` usa la bodega del cliente en sesión (o todas si no tiene).
 */
export function parseUbicacionStock(ubicacionArray, warehouseId = getSessionWarehouseId()) {
  return summarizeStockDetail(parseStockDetail(ubicacionArray), warehouseId).available
}

/** Campo API `stock`: número directo u objeto por bodega → disponible para el cliente. */
export function parseStock(stock) {
  return summarizeStockDetail(parseStockDetail(stock), getSessionWarehouseId()).available
}

/**
 * Stock disponible (cantidadAux) con la misma regla en carga inicial, WS y carrito:
 * bodega del cliente, o suma de todas si no tiene bodega.
 */
export function stockTotal(stock) {
  return parseStock(stock)
}

/** Campo API `imagen_producto`: string, JSON string o array de paths. */
export function parseImageArray(imagenProducto) {
  if (typeof imagenProducto === 'string') {
    const trimmed = imagenProducto.trim()
    if (!trimmed) {
      return []
    }
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      return [trimmed]
    }
  }

  const parsed = parseMaybeJson(imagenProducto, [])
  return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item.trim()) : []
}
