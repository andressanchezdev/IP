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
  { hints: ['aceite', 'aceites', 'lubricante', 'lubricantes', 'oil', 'aceitico'], needles: ['lubricante', 'aceite'] },
  { hints: ['banda', 'bandas', 'correa', 'correas', 'guaya', 'guayas'], needles: ['banda'] },
  { hints: ['disco', 'discos', 'rotor'], needles: ['disco'] },
  { hints: ['llanta', 'llantas', 'llantica', 'llanticas', 'yanta', 'yantas', 'neumatico', 'caucho'], needles: ['llanta'] },
  { hints: ['rin', 'rines', 'rinspa'], needles: ['rin'] },
  { hints: ['amortiguador', 'amortiguadores', 'shock', 'bacheador', 'bacheadores'], needles: ['amortiguador'] },
  { hints: ['filtro', 'filtros'], needles: ['filtro'] },
  { hints: ['cadena', 'cadenas'], needles: ['cadena'] },
  { hints: ['bateria', 'baterias', 'pila'], needles: ['bateria'] },
  { hints: ['bujia', 'bujias'], needles: ['bujia'] },
  { hints: ['casco', 'cascos', 'cachucha'], needles: ['casco'] },
  { hints: ['carburador', 'carburadores', 'chiclero'], needles: ['carburador'] },
]

const PART_FAMILY_TOKENS = new Set(CATEGORY_HINTS.flatMap((group) => group.hints))

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

function levenshtein(left, right) {
  if (left === right) return 0
  if (!left.length) return right.length
  if (!right.length) return left.length
  const rows = left.length + 1
  const cols = right.length + 1
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let row = 0; row < rows; row += 1) matrix[row][0] = row
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      )
    }
  }
  return matrix[left.length][right.length]
}

function tokensLookLikeLlanta(q) {
  return /(?:^|\s)(llanta|llantas|llantica|llanticas|yanta|yantas)(?:\s|$)/.test(` ${q} `)
}

function explicitLlantaBrandAsk(q) {
  return /\bmarca\s+llanta|\bde la marca llanta|\bllanta marca\b/.test(q)
}

function queryHasPartFamilyToken(q) {
  return q.split(' ').some((token) => PART_FAMILY_TOKENS.has(token))
}

function marcaLooksLikePartName(marca) {
  const f = foldMatchText(marca)
  if (!f) return false
  if (tokensLookLikeLlanta(f) || f.includes('llanta')) return true
  return PART_FAMILY_TOKENS.has(f) || [...PART_FAMILY_TOKENS].some((token) => token.length >= 4 && f.includes(token))
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
    return fTokens.some((word) => {
      if (word === token) return true
      if (compact.length >= 3 && compactMatchText(word).includes(compact)) return true
      if (token.length >= 4 && (word.startsWith(token) || token.startsWith(word))) return true
      if (token.length >= 5 && word.length >= 5 && Math.abs(token.length - word.length) <= 2) {
        return levenshtein(token, word) <= 2
      }
      return false
    })
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
  const llantaQuery = tokensLookLikeLlanta(q) && !explicitLlantaBrandAsk(q)
  const partFamilyQuery = queryHasPartFamilyToken(q)
  const categoryFold = foldMatchText(categoria)

  if (fieldMatch(q, modelo)) {
    score += 100
    if (exactish(q, modelo)) score += 50
  }
  if (fieldMatch(q, marca)) {
    const skipMarcaAsPart =
      partFamilyQuery && marcaLooksLikePartName(marca) && !explicitLlantaBrandAsk(q)
    if (!skipMarcaAsPart) score += 80
  }
  if (resolvedCategory && categoryFold === foldMatchText(resolvedCategory)) {
    score += 60
    if (llantaQuery && categoryFold.includes('llanta')) score += 20
  } else if (llantaQuery && categoryFold.includes('llanta')) {
    score += 80
  }
  const qCompact = compactMatchText(q)
  if (qCompact && qCompact === compactMatchText(codigo)) score += 70
  if (llantaQuery) {
    if (fieldMatch(q, descripcion)) score += 30
  } else if (score > 0 && fieldMatch(q, descripcion)) {
    score += 10
  }
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
  return scored.filter((item) => item.score >= 60).map((item) => item.product).slice(0, limit)
}
