import { liveInventory, liveLexiconSet } from './botip/liveData'
import type { ProductRecord } from './types'
import { familyOfText, resolvePartFamily, liveWeakLexemes } from './motoParts'
import type { OfferedProduct, SessionContext } from './sessionContext'

const GENERIC = new Set(['producto', 'productos', 'catalogo', 'pieza', 'repuesto', 'precio', 'stock', 'eso', 'ese', 'esa', 'esto', 'este'])

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function wordsOf(product: ProductRecord) {
  return `${product.nombre} ${product.descripcion} ${product.modelo} ${product.codigo}`
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

export function findInventoryMatches(tokens: readonly string[]): ProductRecord[] {
  const useful = tokens.filter((token) => token.length >= 3 && !GENERIC.has(token) && !liveWeakLexemes().has(token))
  if (!useful.length) return []
  const wanted = resolvePartFamily(useful)
  const scored = liveInventory()
    .map((product) => {
      if (product.status !== 'activo') return { product, score: 0 }
      const productFamily = familyOfText(product.nombre)
      if (wanted && !wanted.ambiguous && productFamily?.id !== wanted.id) {
        return { product, score: 0 }
      }
      if (wanted?.ambiguous) return { product, score: 0 }
      const pool = wordsOf(product)
      const hits = useful.filter((token) =>
        pool.some((word) => word === token || (token.length >= 4 && (word.startsWith(token) || token.startsWith(word)))),
      )
      const modelHit = useful.some(
        (token) =>
          fold(product.modelo) === token ||
          fold(product.codigo).includes(token) ||
          fold(product.descripcion).includes(token),
      )
      return { product, score: hits.length + (modelHit ? 2 : 0) }
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
  const best = scored[0]?.score ?? 0
  const winners = scored.filter((item) => item.score === best)
  const seen = new Set<string>()
  return winners
    .map((item) => item.product)
    .filter((product) => {
      if (seen.has(product.id)) return false
      seen.add(product.id)
      return true
    })
}

export function rememberOffers(ctx: SessionContext | undefined, products: readonly ProductRecord[]) {
  if (!ctx || !products.length) return
  ctx.lastOffers = products.map((product) => ({
    id: product.id,
    label: product.nombre,
    price: retailPrice(product),
    family: familyOfText(product.nombre)?.id || '',
    modelo: product.modelo || undefined,
  }))
}

export function clearLastOffers(ctx: SessionContext) {
  ctx.lastOffers = []
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

function offeredProducts(offers: readonly OfferedProduct[]) {
  if (!offers.length) return [] as ProductRecord[]
  const inventory = liveInventory()
  return offers
    .map((offer) => inventory.find((product) => product.id === offer.id))
    .filter((product): product is ProductRecord => Boolean(product))
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
  if (hits.length > 2) {
    rememberOffers(ctx, hits.slice(0, 4))
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

export function siblingSkuOptions(tokens: readonly string[], ctx?: SessionContext) {
  const hits = findInventoryMatches(tokens)
  if (hits.length < 2) return [] as { label: string; prompt: string }[]
  const hasNarrow =
    tokens.some((token) => token.length >= 4 && !GENERIC.has(token)) &&
    tokens.some(
      (token) =>
        /^\d/.test(token) ||
        ['honda', 'yamaha', 'bajaj', 'akt', 'suzuki', 'pistera', 'urbana', 'sintetico', 'mineral', 'premium'].includes(token),
    )
  if (hasNarrow && hits.length <= 2) {
    rememberOffers(ctx, hits.slice(0, 1))
    return [] as { label: string; prompt: string }[]
  }
  if (hits.length === 2) {
    rememberOffers(ctx, hits)
    return [] as { label: string; prompt: string }[]
  }
  rememberOffers(ctx, hits.slice(0, 4))
  return hits.slice(0, 4).map((product) => ({
    label: product.nombre,
    prompt: product.nombre,
  }))
}
