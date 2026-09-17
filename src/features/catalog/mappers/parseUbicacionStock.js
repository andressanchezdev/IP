import { DEFAULT_STOCK_WAREHOUSE_ID } from '@/shared/api/config'

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

function toNonNegativeNumber(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0
  }
  return numeric
}

/** Estructura por bodega (legacy / stock como objeto). */
export function parseUbicacionStock(ubicacionArray, warehouseId = DEFAULT_STOCK_WAREHOUSE_ID) {
  const parsed = parseMaybeJson(ubicacionArray, {})
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return 0
  }

  const warehouseEntries = parsed[String(warehouseId)]
  if (!Array.isArray(warehouseEntries)) {
    return 0
  }

  return warehouseEntries.reduce((sum, entry) => {
    if (!entry || typeof entry !== 'object') {
      return sum
    }

    const quantity =
      entry.cantidadAux !== undefined && entry.cantidadAux !== null && entry.cantidadAux !== ''
        ? entry.cantidadAux
        : entry.cantidad

    return sum + toNonNegativeNumber(quantity)
  }, 0)
}

/** Campo API `stock`: número directo u objeto por bodega. */
export function parseStock(stock) {
  if (stock == null || stock === '') {
    return 0
  }

  if (typeof stock === 'number') {
    return toNonNegativeNumber(stock)
  }

  if (typeof stock === 'string') {
    const trimmed = stock.trim()
    if (!trimmed) {
      return 0
    }
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return toNonNegativeNumber(trimmed)
    }
  }

  return parseUbicacionStock(stock)
}

/**
 * Suma existencias de todas las bodegas. Número directo u objeto
 * `{ "1": [{ cantidad, cantidadAux }] }`.
 */
export function stockTotal(stock) {
  if (stock == null || stock === '') {
    return 0
  }

  if (typeof stock === 'number') {
    return toNonNegativeNumber(stock)
  }

  if (typeof stock === 'string') {
    const trimmed = stock.trim()
    if (!trimmed) {
      return 0
    }
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return toNonNegativeNumber(trimmed)
    }
  }

  const parsed = parseMaybeJson(stock, null)
  if (parsed == null) {
    return 0
  }

  if (typeof parsed === 'number') {
    return toNonNegativeNumber(parsed)
  }

  const addEntry = (sum, entry) => {
    if (typeof entry === 'number') {
      return sum + toNonNegativeNumber(entry)
    }
    if (!entry || typeof entry !== 'object') {
      return sum
    }
    const quantity =
      entry.cantidad !== undefined && entry.cantidad !== null && entry.cantidad !== ''
        ? entry.cantidad
        : entry.cantidadAux
    return sum + toNonNegativeNumber(quantity)
  }

  if (Array.isArray(parsed)) {
    return parsed.reduce(addEntry, 0)
  }

  if (typeof parsed !== 'object') {
    return 0
  }

  return Object.values(parsed).reduce((sum, value) => {
    if (Array.isArray(value)) {
      return value.reduce(addEntry, sum)
    }
    return addEntry(sum, value)
  }, 0)
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
