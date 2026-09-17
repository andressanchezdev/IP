import { peekGeneralFilterMemory } from '@/features/catalog/api/generalApi'

const ARTICLES = new Set([
  'de', 'del', 'para', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'y', 'o', 'en', 'con', 'por', 'al', 'mi', 'tu', 'su', 'a',
])

const WEAK_DESC = new Set(['del', 'tra', 'der', 'izq', 'ant', 'pos', 'inf', 'sup', 'std', 'oem', 'new'])

/**
 * Pistas de usuario → aguja que debe existir en una categoría oficial de /general/filter.
 * No inventa categorías: si el endpoint no trae esa etiqueta, no hay match.
 */
const CATEGORY_HINTS = [
  { hints: ['pastilla', 'pastillas', 'pasta', 'pastas', 'balata', 'balatas', 'pad', 'pads'], needles: ['pastilla'] },
  { hints: ['aceite', 'aceites', 'lubricante', 'lubricantes', 'oil'], needles: ['lubricante', 'aceite'] },
  { hints: ['banda', 'bandas', 'correa', 'correas'], needles: ['banda'] },
  { hints: ['disco', 'discos', 'rotor'], needles: ['disco'] },
  { hints: ['llanta', 'llantas', 'yanta', 'yantas', 'neumatico', 'caucho'], needles: ['llanta'] },
  { hints: ['rin', 'rines', 'rinspa'], needles: ['rin'] },
  { hints: ['amortiguador', 'amortiguadores', 'shock'], needles: ['amortiguador'] },
  { hints: ['filtro', 'filtros'], needles: ['filtro'] },
  { hints: ['cadena', 'cadenas'], needles: ['cadena'] },
  { hints: ['bateria', 'baterias'], needles: ['bateria'] },
  { hints: ['bujia', 'bujias'], needles: ['bujia'] },
  { hints: ['casco', 'cascos'], needles: ['casco'] },
]

export function foldMatchText(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function compactMatchText(value = '') {
  return foldMatchText(value).replace(/[^a-z0-9]+/g, '')
}

export function normalizarQuery(raw = '') {
  const folded = foldMatchText(raw)
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .replace(/-/g, '')
    .replace(/\b(\d+)\s*cc\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return folded
    .split(' ')
    .filter((token) => token && !ARTICLES.has(token))
    .join(' ')
}

export function isWeakDescription(text = '') {
  const value = String(text || '').trim()
  if (!value) return true
  if (value.length <= 4) return true
  return WEAK_DESC.has(foldMatchText(value))
}

export function productDisplayName(product = {}) {
  const desc = String(product.description ?? product.descripcion ?? '').trim()
  const category = String(product.category ?? product.categoria ?? '').trim()
  const model = String(product.model ?? product.modelo ?? '').trim()
  const brand = String(product.brand ?? product.marca ?? '').trim()
  if (!isWeakDescription(desc)) return desc
  const composed = [category, model, brand].filter(Boolean).join(' · ')
  return composed || model || brand || category || desc || 'Producto'
}

function fieldTokens(value) {
  return foldMatchText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !ARTICLES.has(token))
}

export function fieldMatch(query, field) {
  const q = normalizarQuery(query)
  const f = foldMatchText(field)
  if (!q || !f) return false
  if (f.includes(q) || q.includes(f)) return true
  const qc = compactMatchText(q)
  const fc = compactMatchText(f)
  if (qc.length >= 3 && (fc.includes(qc) || qc.includes(fc))) return true
  const qTokens = q.split(' ').filter((token) => token.length >= 2)
  const fTokens = fieldTokens(f)
  if (!qTokens.length) return false
  return qTokens.some((token) => {
    const compact = compactMatchText(token)
    if (compact.length >= 3 && (fc.includes(compact) || compact.includes(fc))) return true
    return fTokens.some((word) => (
      word === token
      || (compact.length >= 3 && compactMatchText(word).includes(compact))
      || (token.length >= 4 && (word.startsWith(token) || token.startsWith(word)))
    ))
  })
}

function exactish(query, field) {
  const qc = compactMatchText(query)
  const fc = compactMatchText(field)
  return Boolean(qc) && qc === fc
}

export function resolverCategoria(query, categorias = []) {
  const q = normalizarQuery(query)
  if (!q || !Array.isArray(categorias) || !categorias.length) return ''

  const qCompact = compactMatchText(q)
  const direct = categorias.find((item) => {
    const label = foldMatchText(item.label || item.categoria || item.nombre || '')
    if (!label) return false
    return q.includes(label) || label.includes(q) || compactMatchText(label).includes(qCompact)
  })
  if (direct) return String(direct.label || direct.categoria || '').trim()

  for (const group of CATEGORY_HINTS) {
    if (!group.hints.some((hint) => q.split(' ').includes(hint) || q.includes(hint))) continue
    const hit = categorias.find((item) => {
      const label = foldMatchText(item.label || item.categoria || item.nombre || '')
      return group.needles.some((needle) => label.includes(needle))
    })
    if (hit) return String(hit.label || hit.categoria || '').trim()
  }
  return ''
}

export function categoryHintTokens(query, categorias = []) {
  const resolved = resolverCategoria(query, categorias)
  if (!resolved) return []
  const label = foldMatchText(resolved)
  const extra = []
  for (const group of CATEGORY_HINTS) {
    if (!group.needles.some((needle) => label.includes(needle))) continue
    extra.push(...group.hints)
  }
  return extra
}

export function scoreProducto(query, product = {}, resolvedCategory = '') {
  const q = normalizarQuery(query)
  if (!q) return 0
  let score = 0
  const modelo = String(product.modelo ?? product.model ?? '')
  const marca = String(product.marca ?? product.brand ?? '')
  const categoria = String(product.categoria ?? product.category ?? '')
  const codigo = String(product.codigo ?? product.reference ?? '')
  const descripcion = String(product.descripcion ?? product.description ?? '')

  if (fieldMatch(q, modelo)) {
    score += 100
    if (exactish(q, modelo)) score += 50
  }
  if (fieldMatch(q, marca)) score += 80
  if (resolvedCategory && foldMatchText(categoria) === foldMatchText(resolvedCategory)) {
    score += 60
  }
  const qCompact = compactMatchText(q)
  if (qCompact && qCompact === compactMatchText(codigo)) score += 70
  if (score > 0 && fieldMatch(q, descripcion)) score += 10
  return score
}

export function searchTextFromQuery(raw, tokens = [], categorias) {
  const source = normalizarQuery(raw || tokens.join(' '))
  const cats = categorias || peekGeneralFilterMemory()?.categorias || []
  const drop = new Set(categoryHintTokens(source, cats))
  const leftover = source.split(' ').filter((token) => token && !drop.has(token))
  return leftover.join(' ') || source
}

export function rankCatalogProducts(products, query, categorias, options = {}) {
  if (!Array.isArray(products) || !products.length) return []
  const cats = categorias || peekGeneralFilterMemory()?.categorias || []
  const resolved = resolverCategoria(query, cats)
  const scored = products
    .map((product, index) => ({
      product,
      index,
      score: scoreProducto(query, product, resolved),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)

  if (options.keepAll) {
    return scored.map((item) => item.product)
  }

  const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit) : 5
  const strong = scored.filter((item) => item.score >= 60).map((item) => item.product)
  if (strong.length) return strong.slice(0, limit)
  const weak = scored.filter((item) => item.score > 0).map((item) => item.product)
  if (weak.length) return weak.slice(0, limit)
  return products.slice(0, limit)
}
