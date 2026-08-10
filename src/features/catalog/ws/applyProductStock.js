import { DEFAULT_STOCK_WAREHOUSE_ID } from '@/shared/api/config'
import { parseUbicacionStock } from '@/features/catalog/mappers/parseUbicacionStock'
import { normalizeWarehouseId } from '@/shared/ws/normalizeMessage'

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
 * Convierte `listado` WS → mapa { [idBodega]: stockDisponible }.
 */
export function buildStockByWarehouse(listado) {
  const parsed = parseMaybeJson(listado, null)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null
  }

  const stockByWarehouse = {}

  Object.keys(parsed).forEach((rawKey) => {
    const normalizedKey = normalizeWarehouseId(rawKey === '0' ? 0 : rawKey)
    if (!normalizedKey) {
      return
    }
    stockByWarehouse[normalizedKey] = parseUbicacionStock(parsed, rawKey)
  })

  return stockByWarehouse
}

/**
 * Stock a mostrar: bodega preferida → mensaje → default API.
 */
export function resolveDisplayStock(stockByWarehouse, {
  preferredWarehouseId = null,
  messageWarehouseId = null,
} = {}) {
  if (!stockByWarehouse || typeof stockByWarehouse !== 'object') {
    return null
  }

  const candidates = [
    normalizeWarehouseId(
      preferredWarehouseId === '' || preferredWarehouseId == null
        ? null
        : preferredWarehouseId,
    ),
    normalizeWarehouseId(
      messageWarehouseId === '' || messageWarehouseId == null
        ? null
        : messageWarehouseId,
    ),
    DEFAULT_STOCK_WAREHOUSE_ID,
  ].filter(Boolean)

  for (const warehouseId of candidates) {
    if (stockByWarehouse[warehouseId] != null) {
      return {
        warehouseId,
        stock: stockByWarehouse[warehouseId],
      }
    }
  }

  const firstKey = Object.keys(stockByWarehouse)[0]
  if (!firstKey) {
    return null
  }

  return {
    warehouseId: firstKey,
    stock: stockByWarehouse[firstKey],
  }
}

/**
 * Solo actualiza el estado global de productos (catálogo).
 * No toca carrito ni dispara peticiones API.
 */
export function applyProductStockFromListado({
  setProducts,
  productId,
  listado,
  preferredWarehouseId = null,
  messageWarehouseId = null,
}) {
  const id = String(productId ?? '').trim()
  if (!id || listado == null || typeof setProducts !== 'function') {
    return null
  }

  const stockByWarehouse = buildStockByWarehouse(listado)
  if (!stockByWarehouse) {
    return null
  }

  const display = resolveDisplayStock(stockByWarehouse, {
    preferredWarehouseId,
    messageWarehouseId,
  })
  if (!display) {
    return null
  }

  setProducts((currentProducts) =>
    currentProducts.map((product) => {
      if (String(product.id) !== id) {
        return product
      }
      return {
        ...product,
        stock: display.stock,
        stockByWarehouse: {
          ...(product.stockByWarehouse || {}),
          ...stockByWarehouse,
        },
        stockUpdatedAt: Date.now(),
      }
    }),
  )

  return {
    productId: id,
    stock: display.stock,
    warehouseId: display.warehouseId,
    stockByWarehouse,
  }
}
