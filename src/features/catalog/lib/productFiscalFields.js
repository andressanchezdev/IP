/**
 * Campos fiscales del producto (GET /api/v1/general y listados de inventario).
 *
 * Forma real observada en API:
 * {
 *   "iva": 19 | 0,      // tasa %; 0 = sin IVA en el bruto
 *   "exento": 1 | 0,    // flag API (complementa; la tasa `iva` manda el cálculo)
 *   "compra": 17388,    // costo de compra (no es el precio de venta)
 *   "precio": 30000     // bruto de venta
 * }
 *
 * Alias históricos del plan (`purchase`, `exept`) no aparecen en la respuesta;
 * se aceptan solo como fallback de lectura por si el backend cambia el nombre.
 */

const FISCAL_KEYS = ['iva', 'exento', 'compra', 'purchase', 'exept', 'except', 'exempt']

function toFiniteNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

/** Lee tasa IVA (%) del producto/ítem; null si no viene en el payload. */
export function readProductIvaRate(source) {
  return toFiniteNumber(source?.iva, null)
}

/**
 * Exento: preferir tasa `iva === 0`.
 * Si no hay `iva`, usar flag `exento` / alias (truthy y ≠ 0).
 */
export function isProductTaxExempt(source) {
  const rate = readProductIvaRate(source)
  if (rate != null) {
    return rate <= 0
  }

  const flag = source?.exento ?? source?.exept ?? source?.except ?? source?.exempt
  if (flag === undefined || flag === null || flag === '') {
    return false
  }
  if (typeof flag === 'boolean') {
    return flag
  }
  const numeric = Number(flag)
  if (Number.isFinite(numeric)) {
    return numeric !== 0
  }
  const text = String(flag).trim().toLowerCase()
  return text === 'true' || text === 'si' || text === 'sí' || text === 'yes'
}

/** Costo de compra API (`compra`); acepta alias `purchase`. */
export function readProductCompra(source) {
  return toFiniteNumber(source?.compra ?? source?.purchase, null)
}

/** Flag exento crudo normalizado a 0 | 1 | null. */
export function readProductExento(source) {
  const flag = source?.exento ?? source?.exept ?? source?.except ?? source?.exempt
  if (flag === undefined || flag === null || flag === '') {
    return null
  }
  if (typeof flag === 'boolean') {
    return flag ? 1 : 0
  }
  const numeric = Number(flag)
  if (Number.isFinite(numeric)) {
    return numeric !== 0 ? 1 : 0
  }
  return isProductTaxExempt({ exento: flag, iva: null }) ? 1 : 0
}

/**
 * Extrae el bloque fiscal para el modelo de catálogo/carrito.
 * Devuelve solo claves presentes (no inventa valores).
 */
export function pickProductFiscalFields(source) {
  if (!source || typeof source !== 'object') {
    return {}
  }

  const iva = readProductIvaRate(source)
  const exento = readProductExento(source)
  const compra = readProductCompra(source)
  const fiscal = {}

  if (iva != null) {
    fiscal.iva = iva
  }
  if (exento != null) {
    fiscal.exento = exento
  }
  if (compra != null) {
    fiscal.compra = compra
  }

  return fiscal
}

/** Completa campos fiscales del ítem de carrito desde el producto de catálogo. */
export function enrichCartItemFiscalFromCatalog(cartItem, catalogProduct) {
  if (!cartItem || typeof cartItem !== 'object') {
    return cartItem
  }
  if (!catalogProduct) {
    return cartItem
  }

  const fromCart = pickProductFiscalFields(cartItem)
  const fromCatalog = pickProductFiscalFields(catalogProduct)

  return {
    ...cartItem,
    iva: fromCart.iva ?? fromCatalog.iva,
    exento: fromCart.exento ?? fromCatalog.exento,
    compra: fromCart.compra ?? fromCatalog.compra,
  }
}

export function enrichCartItemsFiscalFromCatalog(cartItems = [], products = []) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return cartItems
  }
  const byId = new Map(
    (Array.isArray(products) ? products : []).map((product) => [String(product.id), product]),
  )
  return cartItems.map((item) => (
    enrichCartItemFiscalFromCatalog(item, byId.get(String(item.id)))
  ))
}

export { FISCAL_KEYS }
