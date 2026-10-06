/**
 * Texto de producto único para archivos generados (PDF/Excel) y datos enviados.
 * Orden fijo: descripción · categoría · marca · modelo.
 * Sin imports con alias: se prueba con node --test.
 */

const PLACEHOLDERS = new Set([
  'n/a', 'na', 'null', 'undefined', 'sin descripcion', 'sin dato', 'sin datos', 's/d', 'ninguno',
])

function foldText(value = '') {
  return String(value).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

/** Palabras comparables (sin signos) para detectar partes ya incluidas en otra. */
function wordsKey(value = '') {
  return ` ${foldText(value).replace(/[^a-z0-9]+/g, ' ').trim()} `
}

/** Texto limpio de un campo, o '' si es vacío / placeholder ("—", "N/A", "Producto #12"). */
export function cleanProductField(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const folded = foldText(text)
  if (/^[-\u2012-\u2015_.\s]+$/.test(folded)) return ''
  if (PLACEHOLDERS.has(folded)) return ''
  if (/^producto\s*#/.test(folded)) return ''
  return text
}

function firstClean(...values) {
  for (const value of values) {
    const text = cleanProductField(value)
    if (text) return text
  }
  return ''
}

/** Campos del producto con alias español/inglés (API, carrito, pedido, catálogo). */
export function readProductParts(source = {}) {
  const item = source && typeof source === 'object' ? source : {}
  return {
    description: firstClean(item.description, item.descripcion, item.nombre),
    category: firstClean(item.category, item.categoria),
    brand: firstClean(item.brand, item.marca),
    model: firstClean(item.model, item.modelo),
    reference: String(item.reference ?? item.codigo ?? item.id ?? '').trim(),
  }
}

const DETAIL_ORDER = ['description', 'category', 'brand', 'model']

/**
 * Segmentos { key, value } visibles en orden descripción, categoría, marca, modelo.
 * Omite vacíos y los que ya están dentro de lo anterior ("ACEITE MOTUL 20W50" + marca "MOTUL").
 * `omit`: nombres de partes a excluir (p. ej. ['brand'] si la marca va en su propia columna).
 * Útil cuando el texto no cabe y hay que acortar solo la descripción.
 */
export function buildProductDetailSegments(source = {}, { omit = [] } = {}) {
  const parts = readProductParts(source)
  const skipped = new Set(omit)
  const result = []
  let accumulated = ' '

  DETAIL_ORDER.forEach((key) => {
    if (skipped.has(key)) return
    const value = parts[key]
    if (!value) return
    const needle = wordsKey(value)
    if (needle.trim() && accumulated.includes(needle)) return
    result.push({ key, value })
    accumulated += wordsKey(value).trimStart()
  })
  return result
}

export function buildProductDetailParts(source = {}, options = {}) {
  return buildProductDetailSegments(source, options).map((segment) => segment.value)
}

/**
 * Texto único del producto: "descripcion · categoria · marca · modelo".
 * Si no hay ningún dato devuelve "Producto <código>" (o "Producto").
 */
export function buildProductDetailText(source = {}, {
  separator = ' \u00B7 ',
  upper = false,
  omit = [],
} = {}) {
  const parts = buildProductDetailParts(source, { omit })
  let text = parts.join(separator)
  if (!text) {
    const { reference } = readProductParts(source)
    text = reference ? `Producto ${reference}` : 'Producto'
  }
  return upper ? text.toLocaleUpperCase('es') : text
}
