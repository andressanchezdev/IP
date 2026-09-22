import { rankCatalogProducts } from '@/features/catalog/lib/catalogMatch'
import { liveBrandNames, liveInventory, liveLexiconSet, liveModelNames } from './botip/liveData'
import type { ProductRecord } from './types'
import { familyOfText, resolvePartFamily, liveWeakLexemes, isPositionToken, productPositionAlignment } from './motoParts'
import type { OfferedProduct, SessionContext } from './sessionContext'

const GENERIC = new Set(['producto', 'productos', 'catalogo', 'pieza', 'repuesto', 'precio', 'stock', 'eso', 'ese', 'esa', 'esto', 'este'])

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function wordsOf(product: ProductRecord) {
  return `${product.nombre} ${product.modelo} ${product.marca || ''} ${product.category || ''} ${product.codigo} ${product.descripcion}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2)
}

function familyWords(family: string) {
  const stem = fold(family).replace(/_/g, ' ')
  return new Set([stem, `${stem}s`, ...stem.split(/\s+/).filter((part) => part.length > 2)])
}

export function formatCop(value: number) {
  return `$ ${Math.round(value).toLocaleString('es-CO')}`
}

export const PRICE_DISCLAIMER =
  'Este valor puede estar desactualizado; un asesor real debe confirmarlo.'

/** Precio que usa el chat: solo `empresarial`. No usa mayorista ni minorista. */
export function retailPrice(product: ProductRecord) {
  return product.precios[0]?.empresarial ?? 0
}

function activeLote() {
  return liveInventory().filter((product) => product.status === 'activo')
}

function familyText(product: ProductRecord) {
  return `${product.nombre} ${product.category || ''} ${product.descripcion || ''}`
}

export function findInventoryMatches(tokens: readonly string[]): ProductRecord[] {
  const lote = activeLote()
  if (!lote.length) return []
  const useful = tokens.filter((token) => token.length >= 3 && !GENERIC.has(token) && !liveWeakLexemes().has(token))
  if (!useful.length) return lote.slice(0, 5)

  const ranked = rankCatalogProducts(lote, useful.join(' '))
  const wanted = resolvePartFamily(useful)
  const wantedId = wanted && !wanted.ambiguous ? wanted.id : ''
  if (!wantedId) return ranked

  const familyHits = ranked.filter((product) => familyOfText(familyText(product))?.id === wantedId)
  const pool = familyHits.length ? familyHits : ranked
  const asked = useful.filter((token) => isPositionToken(token))
  if (!asked.length) return pool
  const aligned = pool.filter((product) => productPositionAlignment(familyText(product), asked) !== 'opposite')
  const preferred = aligned.filter((product) => productPositionAlignment(familyText(product), asked) === 'match')
  return preferred.length ? preferred : aligned
}

export function rememberOffers(ctx: SessionContext | undefined, products: readonly ProductRecord[]) {
  if (!ctx || !products.length) return
  ctx.lastOffers = products.map((product) => ({
    id: product.id,
    label: product.nombre,
    price: retailPrice(product),
    family: familyOfText(familyText(product))?.id || '',
    category: product.category || undefined,
    marca: product.marca || undefined,
    modelo: product.modelo || undefined,
    cantidad: product.cantidad,
    codigo: product.codigo || undefined,
  }))
  ctx.lastOffersAt = Date.now()
}

export function clearLastOffers(ctx: SessionContext) {
  ctx.lastOffers = []
  ctx.lastOffersAt = 0
}

export function extractMentionedPrices(tokens: readonly string[], raw = '') {
  const prices = new Set<number>()
  const text = fold(raw).replace(/\$/g, ' ')
  for (const match of text.matchAll(/(\d{1,3}(?:[.\s,]\d{3})+)/g)) {
    const value = Number(match[1].replace(/[.\s,]/g, ''))
    if (value > 0) prices.add(value)
  }
  for (const match of text.matchAll(/\b(\d{4,})\b/g)) {
    prices.add(Number(match[1]))
  }
  const digits = tokens.filter((token) => /^\d+$/.test(token))
  for (let index = 0; index < digits.length; index += 1) {
    const current = digits[index]
    const next = digits[index + 1]
    if (next && /^0{3}$/.test(next) && current.length <= 3) {
      prices.add(Number(current) * 1000)
      continue
    }
    if (current.length >= 4) prices.add(Number(current))
  }
  return [...prices]
}

function pricesMatch(mentioned: number, actual: number) {
  if (!mentioned || !actual) return false
  if (mentioned === actual) return true
  if (mentioned < 1000 && actual >= 1000 && Math.floor(actual / 1000) === mentioned) return true
  return false
}

function chooseWords() {
  return liveLexiconSet(
    'chooseCues',
    new Set(['esa', 'ese', 'eso', 'esta', 'este', 'voy', 'llevar', 'llevo', 'pido', 'pedir', 'quiero', 'comprar', 'compra']),
  )
}

function distinctiveTokens(tokens: readonly string[], offers: readonly OfferedProduct[]) {
  const families = new Set<string>()
  for (const offer of offers) {
    for (const word of familyWords(offer.family || offer.label)) families.add(word)
  }
  const weak = liveWeakLexemes()
  const choose = chooseWords()
  return tokens.filter((token) => {
    if (token.length < 3 || GENERIC.has(token) || weak.has(token) || choose.has(token)) return false
    if (/^\d+$/.test(token)) return false
    if (families.has(token) || families.has(token.replace(/s$/, ''))) return false
    return true
  })
}

function recordFromOffer(offer: OfferedProduct): ProductRecord {
  return {
    id: offer.id,
    codigo: offer.codigo || '',
    nombre: offer.label,
    descripcion: offer.label,
    modelo: offer.modelo || '',
    marca: offer.marca,
    category: offer.category || '',
    precios: [{ mayorista: 0, minorista: 0, empresarial: offer.price }],
    cantidad: typeof offer.cantidad === 'number' ? offer.cantidad : 0,
    bodega: '',
    status: 'activo',
    creado_en: '',
    actualizado_en: '',
  }
}

function offeredProducts(offers: readonly OfferedProduct[]) {
  if (!offers.length) return [] as ProductRecord[]
  const inventory = liveInventory()
  return offers.map((offer) => inventory.find((product) => product.id === offer.id) || recordFromOffer(offer))
}

export function pickOfferByIndex(ctx: SessionContext, raw = ''): ProductRecord | null {
  const match = String(raw || '').trim().match(/^[1-5]$/)
  if (!match || !ctx.lastOffers?.length) return null
  const offer = ctx.lastOffers[Number(match[0]) - 1]
  if (!offer) return null
  return offeredProducts([offer])[0] || null
}

export function pickLastOffer(ctx: SessionContext, tokens: readonly string[], raw = ''): ProductRecord | null {
  const offers = ctx.lastOffers || []
  if (!offers.length) return null
  const products = offeredProducts(offers)
  if (!products.length) return null
  const text = raw || ctx.lastUserText || ''
  const prices = extractMentionedPrices(tokens, text)
  const useful = distinctiveTokens(tokens, offers)

  const scored = products.map((product) => {
    const pool = wordsOf(product)
    const nameHits = useful.filter((token) =>
      pool.some((word) => word === token || (token.length >= 4 && (word.startsWith(token) || token.startsWith(word)))),
    )
    const price = retailPrice(product)
    const priceHit = prices.some((value) => pricesMatch(value, price))
    return { product, nameScore: nameHits.length, priceScore: priceHit ? 1 : 0 }
  })

  if (products.length === 1 && useful.length === 0 && prices.length === 0) {
    return products[0]
  }

  const byPrice = scored.filter((item) => item.priceScore > 0)
  if (byPrice.length === 1) return byPrice[0].product

  const bestName = Math.max(0, ...scored.map((item) => item.nameScore))
  const byName = scored.filter((item) => item.nameScore === bestName && bestName > 0)
  if (byName.length === 1) return byName[0].product

  return null
}

export function inventoryOffer(product: ProductRecord) {
  const price = retailPrice(product)
  const active = product.status === 'activo'
  const inStock = active && product.cantidad > 0
  const estado = inStock ? 'disponible ✅' : 'sin existencias ❌'
  return {
    label: product.nombre,
    priceText: formatCop(price),
    stockText: estado,
    disclaimer: PRICE_DISCLAIMER,
  }
}

export function formatOfferCard(product: ProductRecord) {
  const offer = inventoryOffer(product)
  return [
    offer.label,
    `Precio empresarial: ${offer.priceText}`,
    `Disponibilidad: ${offer.stockText}`,
    offer.disclaimer,
  ].join('\n')
}

export function inventorySummary(tokens: readonly string[], ctx?: SessionContext) {
  const raw = ctx?.lastUserText || ''
  const picked = ctx ? pickLastOffer(ctx, tokens, raw) : null
  if (picked) {
    if (picked.cantidad <= 0) {
      return `${picked.nombre}\nSin existencias en este momento.\n${PRICE_DISCLAIMER}`
    }
    return formatOfferCard(picked)
  }
  const hits = findInventoryMatches(tokens)
  if (!hits.length) return null
  if (hits.length > 5) {
    rememberOffers(ctx, hits.slice(0, 5))
    return null
  }
  if (hits.length > 2) {
    rememberOffers(ctx, hits.slice(0, 5))
    return null
  }
  const only = hits[0]
  if (hits.length === 2) {
    rememberOffers(ctx, hits)
    const cards = hits.map((product) =>
      product.cantidad <= 0
        ? `${product.nombre}\nSin existencias en este momento.\n${PRICE_DISCLAIMER}`
        : formatOfferCard(product),
    )
    return cards.join('\n\n')
  }
  if (only.cantidad <= 0) {
    rememberOffers(ctx, [only])
    return `${only.nombre}\nSin existencias en este momento.\n${PRICE_DISCLAIMER}`
  }
  rememberOffers(ctx, hits)
  return formatOfferCard(only)
}

export function formatMatchLine(product: ProductRecord, index?: number) {
  const price = retailPrice(product)
  const bits = [
    product.nombre || product.category || '',
    product.category && product.nombre && fold(product.nombre) !== fold(product.category) ? product.category : '',
    product.modelo || '',
    product.marca || '',
    price > 0 ? formatCop(price) : '',
  ].filter(Boolean)
  const line = bits.join(' · ') || product.nombre || 'Producto'
  return typeof index === 'number' ? `${index}. ${line}` : line
}

export function formatMatchesListText(query: string, products: readonly ProductRecord[]) {
  const shown = products.slice(0, 5)
  const n = shown.length
  const lines = [
    '🔍 Búsqueda',
    '',
    `Encontré **${n} coincidencia${n === 1 ? '' : 's'}** para "${query}":`,
  ]
  if (n > 1) {
    lines.push('', '¿Cuál quieres agregar? (número o nombre)')
  }
  return lines.join('\n')
}

export function formatSingleMatchText(product: ProductRecord) {
  return [
    '🔍 Encontré:',
    '',
    formatMatchLine(product),
    '',
    '🛒 ¿Agregar al carrito?',
    '',
    '[ Sí ]   [ No ]',
  ].join('\n')
}

export function catalogSearchQuery(product: Pick<ProductRecord, 'codigo' | 'nombre' | 'id'>) {
  const codigo = String(product.codigo || '').trim()
  if (codigo) return codigo
  const id = String(product.id || '').trim()
  if (id && id !== '-1' && Number(id) > 0) return id
  return String(product.nombre || '').trim()
}

function compact(value: string) {
  return fold(value).replace(/[^a-z0-9]+/g, '')
}

function askedWithoutBrand(raw: string) {
  return /\bsin\s+marca\b/.test(fold(raw))
}

export function enrichSearchWithBrand(key: string, brand?: string) {
  const query = String(key || '').replace(/\s+/g, ' ').trim()
  const marca = String(brand || '').replace(/\s+/g, ' ').trim()
  if (!query) return marca
  if (!marca) return query
  if (fold(query).includes(fold(marca))) return query
  return `${query} ${marca}`.trim()
}

function matchLiveBrand(raw: string, tokens: readonly string[]) {
  const foldedRaw = fold(raw)
  const names = liveBrandNames().filter(Boolean)
  const contained = names
    .filter((name) => {
      const label = fold(name)
      return label.length >= 3 && foldedRaw.includes(label)
    })
    .sort((left, right) => fold(right).length - fold(left).length)
  if (contained[0]) return contained[0]
  const tokenHits = names.filter((name) => tokens.includes(fold(name)))
  return tokenHits.length === 1 ? tokenHits[0] : ''
}

function inferBrandFromModel(model: string) {
  const needle = compact(model)
  if (needle.length < 3) return ''
  const brands = new Set<string>()
  for (const product of liveInventory()) {
    const modelo = compact(product.modelo || '')
    if (!modelo) continue
    if (modelo.includes(needle) || needle.includes(modelo)) {
      const marca = String(product.marca || '').trim()
      if (marca) brands.add(marca)
    }
  }
  return brands.size === 1 ? [...brands][0] : ''
}

/** Public helper for entity extraction (model → single inventory brand). */
export function inferBrandFromModelName(model: string) {
  return inferBrandFromModel(model)
}

function modelFromText(raw: string, tokens: readonly string[]) {
  const foldedRaw = fold(raw)
  const contained = liveModelNames()
    .filter((name) => {
      const label = fold(name)
      const tight = compact(name)
      if (tight.length < 3) return false
      return foldedRaw.includes(label) || tokens.some((token) => compact(token) === tight || tight.includes(compact(token)))
    })
    .sort((left, right) => compact(right).length - compact(left).length)
  return contained[0] || tokens.find((token) => /^[a-z]+\d+[a-z0-9]*$/i.test(token) && token.length >= 3) || ''
}

export function resolveSearchBrand(input: {
  raw?: string
  tokens?: readonly string[]
  ctx?: SessionContext
  product?: { marca?: string; modelo?: string }
  products?: readonly { marca?: string; modelo?: string }[]
} = {}) {
  const raw = String(input.raw || '')
  const tokens = input.tokens?.length
    ? input.tokens
    : fold(raw).split(/[^a-z0-9]+/).filter(Boolean)
  if (askedWithoutBrand(raw)) return ''

  const userBrand = matchLiveBrand(raw, tokens)
  if (userBrand) return userBrand

  const marcaCue = fold(raw).match(/\bmarca\s+([a-z0-9]+)/)?.[1] || ''
  if (marcaCue) {
    const canonical = matchLiveBrand(marcaCue, [marcaCue])
    if (canonical) return canonical
    const named = liveBrandNames().find((name) => {
      const label = fold(name)
      return label === marcaCue || label.startsWith(`${marcaCue} `) || compact(name).startsWith(marcaCue)
    })
    return named || marcaCue
  }

  const productBrand = String(input.product?.marca || '').trim()
  if (productBrand) return productBrand

  const shared = [...new Set((input.products || []).map((item) => String(item.marca || '').trim()).filter(Boolean))]
  if (shared.length === 1) return shared[0]

  const ctxBrand = String(
    input.ctx?.entities?.marca
    || input.ctx?.conversationFocus?.marca
    || input.ctx?.scaffoldedSearch?.captured?.brand
    || '',
  ).trim()
  if (ctxBrand) return matchLiveBrand(ctxBrand, fold(ctxBrand).split(/[^a-z0-9]+/).filter(Boolean)) || ctxBrand

  const modelo = modelFromText(raw, tokens)
    || String(input.product?.modelo || input.ctx?.entities?.modelo || input.ctx?.scaffoldedSearch?.captured?.model || '').trim()
  if (modelo) return inferBrandFromModel(modelo)
  return ''
}

export function searchBarQuery(
  key: string,
  opts?: {
    raw?: string
    tokens?: readonly string[]
    ctx?: SessionContext
    product?: { marca?: string; modelo?: string }
    products?: readonly { marca?: string; modelo?: string }[]
  },
) {
  const campo = String(key || '').replace(/\s+/g, ' ').trim()
  if (!campo) return ''
  const brand = resolveSearchBrand({
    raw: opts?.raw || campo,
    tokens: opts?.tokens,
    ctx: opts?.ctx,
    product: opts?.product,
    products: opts?.products,
  })
  return enrichSearchWithBrand(campo, brand)
}

export function catalogOptionLabel(product: ProductRecord, siblings: readonly ProductRecord[]) {
  const extra = [product.marca, product.modelo].filter(Boolean).join(' · ')
  const name = String(product.nombre || product.descripcion || '').trim()
  if (!name) return extra || 'Producto'
  const sameName = siblings.filter((item) => fold(item.nombre) === fold(name)).length > 1
  if (!sameName) return name
  return extra ? `${name} · ${extra}` : name
}

export function catalogChoiceOptions(tokens: readonly string[], ctx?: SessionContext) {
  const hits = findInventoryMatches(tokens)
  if (hits.length > 5) {
    rememberOffers(ctx, hits.slice(0, 5))
    return [] as { label: string; search: string }[]
  }
  if (hits.length < 2) {
    if (hits.length === 1) rememberOffers(ctx, hits)
    return [] as { label: string; search: string }[]
  }
  rememberOffers(ctx, hits)
  return hits.map((product) => ({
    label: catalogOptionLabel(product, hits),
    search: enrichSearchWithBrand(catalogSearchQuery(product), product.marca),
  }))
}

export function productChoiceOptions(products: readonly ProductRecord[]) {
  const shown = products.slice(0, 5)
  return shown.map((product) => {
    const name = catalogOptionLabel(product, shown)
    const codigo = String(product.codigo || '').trim()
    return {
      kind: 'catalog-search' as const,
      label: name,
      search: enrichSearchWithBrand(codigo || catalogSearchQuery(product), product.marca),
      prompt: name,
    }
  })
}
