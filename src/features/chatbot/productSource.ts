import {
  getLatestInventoryProducts,
  getGeneralFilter,
  readGeneralFilterMemory,
  searchInventoryProducts,
} from '@/features/catalog/api/generalApi'
import { getApiAuthToken } from '@/shared/api'
import type { SessionContext } from './sessionContext'
import type { ProductRecord } from './types'
import { findTerm, liveCatalogParts, resolvePartFamily } from './motoParts'
import {
  productDisplayName,
  rankCatalogProducts,
  searchTextFromQuery,
} from '@/features/catalog/lib/catalogMatch'
import { stockTotal } from '@/features/catalog/mappers/parseUbicacionStock'
import { getCatalogProductId } from '@/features/catalog/mappers/mapProduct'
import { pickProductFiscalFields } from '@/features/catalog/lib/productFiscalFields'

const GENERIC = new Set([
  'producto',
  'productos',
  'catalogo',
  'pieza',
  'repuesto',
  'repuestos',
  'precio',
  'precios',
  'stock',
  'eso',
  'ese',
  'esa',
  'esto',
  'este',
  'hola',
  'gracias',
])

const SKIP = new Set([
  ...GENERIC,
  'tienen',
  'tiene',
  'hay',
  'saber',
  'quiero',
  'quisiera',
  'cuanto',
  'vale',
  'valor',
  'cuesta',
  'costo',
  'cotizar',
  'cotizacion',
  'disponible',
  'disponibles',
  'disponibilidad',
  'existencia',
  'existencias',
  'completo',
  'completa',
  'completos',
  'completas',
  'lista',
  'listado',
  'pueden',
  'puede',
  'ustedes',
  'usted',
  'consiguen',
  'consigue',
  'manejan',
  'maneja',
  'obtener',
  'obtengo',
  'ver',
  'mira',
  'mirar',
  'mostrar',
  'muestra',
  'indicar',
  'indica',
  'pasar',
  'pasa',
  'referencia',
  'referencias',
  'marca',
  'marcas',
  'modelo',
  'modelos',
  'categoria',
  'categorias',
  'moto',
  'motos',
  'accesorio',
  'accesorios',
  'nuevo',
  'nuevos',
  'novedad',
  'novedades',
  'reciente',
  'recientes',
  'averiguar',
  'encontrar',
  'encontrarlos',
  'buscar',
  'busco',
  'buscando',
  'comprar',
  'compra',
  'puedo',
  'ayudarme',
  'ayudan',
  'diversos',
  'varios',
  'diferente',
  'diferentes',
  'estoy',
  'devolver',
  'devolucion',
  'devoluciones',
  'reembolso',
])

const LATEST_CUES = new Set(['nuevo', 'nuevos', 'novedad', 'novedades', 'reciente', 'recientes'])
const STOCK_CUES = new Set(['stock', 'existencia', 'existencias', 'disponible', 'disponibles', 'cantidad'])
const PRICE_CUES = new Set(['precio', 'precios', 'vale', 'valor', 'cuesta', 'costo', 'cotizar', 'cotizacion', 'cuanto'])
const EXIST_CUES = new Set(['tienen', 'tiene', 'hay', 'existe', 'consiguen', 'manejan'])
const LIST_CUES = new Set(['lista', 'listado', 'completo', 'completa', 'todos', 'todas', 'disponibles'])

const QUERY_TTL_MS = 60 * 1000
const OFFERS_TTL_MS = 3 * 60 * 1000
const SEARCH_MAX = 80

export type ProductQuerySource = 'desarrollo' | 'sesion' | 'cache' | 'api' | 'login' | 'acote'
export type ProductAct = 'none' | 'precio' | 'stock' | 'existe' | 'listado' | 'novedades' | 'export' | 'followup'
export type ProductConfidence = 'alta' | 'media' | 'baja'
export type CatalogUiSlot = 'marca' | 'modelo' | 'categoria' | 'producto' | 'none'

export type CatalogFilterPayload = {
  brands: string[]
  categories: string[]
  models: string[]
}

export type ProductQueryPlan = {
  source: ProductQuerySource
  act: ProductAct
  confidence: ProductConfidence
  searchText: string
  withStock: boolean
  signature: string
  uiSlot: CatalogUiSlot
  filterPayload: CatalogFilterPayload
  filterLabel: string
}

const EMPTY_FILTER_PAYLOAD: CatalogFilterPayload = {
  brands: [],
  categories: [],
  models: [],
}

let cachedProducts: ProductRecord[] = []
let inflight: Promise<void> | null = null
let abortController: AbortController | null = null
let lastSignature = ''
let lastFetchedAt = 0
let lastPlan: ProductQueryPlan | null = null
let lastFetchFailed = false

export function chatHasAuth() {
  return Boolean(getApiAuthToken())
}

export function getCachedChatProducts(): ProductRecord[] {
  return cachedProducts
}

export function setCachedChatProducts(products: ProductRecord[]) {
  cachedProducts = Array.isArray(products) ? products : []
}

export function clearCachedChatProducts() {
  cachedProducts = []
}

export function getLastProductPlan() {
  return lastPlan
}

export function lastProductFetchFailed() {
  return lastFetchFailed
}

function pickProductDisplayName(product: Record<string, unknown>, codigo: string) {
  const code = codigo.trim().toLowerCase()
  const mapped = {
    descripcion: String(product?.descripcion ?? product?.description ?? '').trim(),
    categoria: String(product?.categoria ?? product?.category ?? '').trim(),
    modelo: String(product?.modelo ?? product?.model ?? '').trim(),
    marca: String(product?.marca ?? product?.brand ?? '').trim(),
  }
  const composed = productDisplayName(mapped)
  if (composed && code && composed.toLowerCase() !== code) return composed
  return composed
}

export function mapApiProductToRecord(product: Record<string, unknown>): ProductRecord | null {
  // Solo id de inventario (nunca codigo/barcode ni nombre como id).
  const id = getCatalogProductId(product) || ''
  const codigo = String(product?.codigo ?? product?.reference ?? '').trim()
  const descripcion = String(product?.descripcion ?? product?.description ?? '').trim()
  const nombre = pickProductDisplayName(product, codigo)
  if (!id) {
    return null
  }
  const precio = Number(product?.precio ?? product?.price ?? 0)
  const stock = stockTotal(product?.stock ?? product?.cantidad ?? 0)
  const fiscal = pickProductFiscalFields(product)
  const aplicacion = String(product?.aplicacion ?? '').trim()
  return {
    id,
    codigo,
    nombre: nombre || codigo || id,
    descripcion,
    modelo: String(product?.modelo ?? product?.model ?? '').trim(),
    marca: String(product?.marca ?? product?.brand ?? '').trim() || undefined,
    category: String(product?.categoria ?? product?.category ?? '').trim() || undefined,
    precios: [{
      mayorista: 0,
      minorista: 0,
      empresarial: Number.isFinite(precio) && precio >= 0 ? precio : 0,
    }],
    cantidad: Number.isFinite(stock) && stock > 0 ? stock : 0,
    bodega: '',
    status: 'activo',
    creado_en: '',
    actualizado_en: '',
    aplicacion: aplicacion || undefined,
    ...fiscal,
  }
}

function fold(raw: string) {
  return raw.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

function wantsLatest(tokens: readonly string[], raw: string) {
  const folded = fold(raw)
  return tokens.some((token) => LATEST_CUES.has(token)) || /\bnuevos?\b/.test(folded)
}

function wantsStock(tokens: readonly string[]) {
  return tokens.some((token) => STOCK_CUES.has(token))
}

const BRAND_HINTS = new Set([
  'honda',
  'yamaha',
  'bajaj',
  'akt',
  'suzuki',
  'kawasaki',
  'hero',
  'kymco',
  'victory',
  'motul',
  'mobil',
  'havoline',
  'advance',
])

function isModelYear(token: string) {
  const year = Number(token)
  return Number.isInteger(year) && year >= 1990 && year <= 2035
}

function usefulTokens(tokens: readonly string[]) {
  return tokens.filter((token) => token.length >= 3 && !SKIP.has(token) && !isModelYear(token))
}

function looksLikeCode(token: string) {
  if (isModelYear(token)) return false
  return /^(?=.*\d)[a-z0-9-]{3,}$/i.test(token)
}

function vehicleBits(tokens: readonly string[], ctx: SessionContext) {
  const marca = tokens.find((token) => BRAND_HINTS.has(token)) || ctx.entities.marca || ''
  const modelo =
    tokens.find((token) => /^[a-z]+\d+[a-z0-9]*$/i.test(token) && !isModelYear(token) && token.length >= 3) ||
    ctx.entities.modelo ||
    ''
  return [String(marca).trim(), String(modelo).trim()].filter(Boolean)
}

function isPastaBrakeAsk(raw: string, tokens: readonly string[]) {
  return /\bpastas?(?:\s+de(?:\s+freno)?)?\b/.test(fold(`${raw} ${tokens.join(' ')}`))
}

function buildSearchText(tokens: readonly string[], ctx: SessionContext, raw = '') {
  const normalized = searchTextFromQuery(raw, tokens)
  const leftover = fold(normalized)
  const leftoverWeak = !leftover || /^(freno|frenos|pasta|pastas)$/.test(leftover)
  if (isPastaBrakeAsk(raw, tokens) && leftoverWeak) {
    const bits = vehicleBits(tokens, ctx)
    return sanitizeSearch(['pastillas', ...bits].join(' '))
  }
  if (normalized) return sanitizeSearch(normalized)
  const useful = usefulTokens(tokens)
  const merged = [...useful]
  for (const bit of vehicleBits(tokens, ctx)) {
    if (!merged.includes(bit)) merged.push(bit)
  }
  return sanitizeSearch(merged.join(' '))
}

function offersAreFresh(ctx: SessionContext, now = Date.now()) {
  const at = typeof ctx.lastOffersAt === 'number' ? ctx.lastOffersAt : 0
  return (ctx.lastOffers?.length || 0) > 0 && now - at < OFFERS_TTL_MS
}

function sanitizeSearch(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, SEARCH_MAX)
}

function offerSearchText(ctx: SessionContext) {
  const offers = ctx.lastOffers || []
  const parts = offers
    .slice(0, 2)
    .map((item) => String(item.label || '').trim())
    .filter(Boolean)
  return sanitizeSearch(parts.join(' '))
}

function skipPlan(source: ProductQuerySource, act: ProductAct, confidence: ProductConfidence, extra?: Partial<ProductQueryPlan>): ProductQueryPlan {
  return {
    source,
    act,
    confidence,
    searchText: '',
    withStock: false,
    signature: `${source}|${act}`,
    uiSlot: 'none',
    filterPayload: EMPTY_FILTER_PAYLOAD,
    filterLabel: '',
    ...extra,
  }
}

function isVehicleModelToken(token: string) {
  return /^[a-z]+\d+[a-z0-9]*$/i.test(token) && !isModelYear(token) && token.length >= 3
}

function hasNamedProduct(tokens: readonly string[]) {
  if (tokens.some((token) => looksLikeCode(token) && !isVehicleModelToken(token))) return true
  const family = resolvePartFamily(tokens)
  if (family && !family.ambiguous) return true
  return Boolean(findTerm(tokens, liveCatalogParts()))
}

function matchFilterOptions(
  options: Array<{ id: string, label: string }>,
  tokens: readonly string[],
) {
  const ids: string[] = []
  const matched = new Set<string>()
  const labels: string[] = []
  for (const option of options) {
    const label = fold(String(option.label || ''))
    if (!label) continue
    const parts = label.split(/[^a-z0-9]+/).filter((part) => part.length >= 2)
    const hitTokens = tokens.filter((token) => (
      token === label
      || parts.includes(token)
      || (token.length >= 4 && label.includes(token))
    ))
    if (!hitTokens.length) continue
    ids.push(String(option.id))
    labels.push(String(option.label || '').trim())
    hitTokens.forEach((token) => matched.add(token))
  }
  return { ids, matched, labels }
}

function resolveCatalogUi(tokens: readonly string[], ctx: SessionContext) {
  const memory = readGeneralFilterMemory()
  const brands = matchFilterOptions(memory?.marcas || [], tokens)
  const models = matchFilterOptions(memory?.modelos || [], tokens)
  const cats = matchFilterOptions(memory?.categorias || [], tokens)

  const entityMarca = fold(ctx.entities.marca || '')
  const entityModelo = fold(ctx.entities.modelo || '')
  if (entityMarca && tokens.includes(entityMarca)) {
    brands.matched.add(entityMarca)
    if (!brands.labels.length) brands.labels.push(String(ctx.entities.marca))
  }
  if (entityModelo && tokens.includes(entityModelo)) {
    models.matched.add(entityModelo)
    if (!models.labels.length) models.labels.push(String(ctx.entities.modelo))
  }

  for (const token of tokens) {
    if (BRAND_HINTS.has(token)) brands.matched.add(token)
    if (isVehicleModelToken(token)) models.matched.add(token)
    if (BRAND_HINTS.has(token) && !brands.labels.length) brands.labels.push(token)
    if (isVehicleModelToken(token) && !models.labels.length) models.labels.push(token)
  }

  const useful = usefulTokens(tokens)
  const facetTokens = new Set([...brands.matched, ...models.matched, ...cats.matched])
  const productLeftover = useful.filter((token) => !facetTokens.has(token))
  const namedProduct = hasNamedProduct(tokens)
  const payload: CatalogFilterPayload = {
    brands: brands.ids,
    categories: cats.ids,
    models: models.ids,
  }

  if (namedProduct || productLeftover.length > 0) {
    return {
      slot: (namedProduct || productLeftover.length > 0 ? 'producto' : 'none') as CatalogUiSlot,
      payload,
      label: '',
    }
  }

  if (models.matched.size) {
    return {
      slot: 'modelo' as const,
      payload: { brands: brands.ids, categories: [], models: models.ids },
      label: models.labels[0] || brands.labels[0] || 'ese modelo',
    }
  }
  if (brands.matched.size) {
    return {
      slot: 'marca' as const,
      payload: { brands: brands.ids, categories: [], models: [] },
      label: brands.labels[0] || 'esa marca',
    }
  }
  if (cats.matched.size) {
    return {
      slot: 'categoria' as const,
      payload: { brands: [], categories: cats.ids, models: [] },
      label: cats.labels[0] || 'esa categoría',
    }
  }

  return { slot: 'none' as const, payload: EMPTY_FILTER_PAYLOAD, label: '' }
}

function isFilterSlot(slot: CatalogUiSlot) {
  return slot === 'marca' || slot === 'modelo' || slot === 'categoria'
}

export function planProductQuery({
  tokens,
  raw,
  ctx,
  kind,
}: {
  tokens: readonly string[]
  raw: string
  ctx: SessionContext
  kind: string
}): ProductQueryPlan {
  const text = fold(raw)
  const useful = usefulTokens(tokens)
  const searchText = buildSearchText(tokens, ctx, raw)
  const latest = wantsLatest(tokens, raw)
  const stockAsk = wantsStock(tokens) || /\b(hay|disponible|disponibilidad)\b/.test(text)
  const priceAsk =
    tokens.some((token) => PRICE_CUES.has(token)) ||
    /cuanto (vale|cuesta)|que valor|que precio/.test(text)
  const existAsk = tokens.some((token) => EXIST_CUES.has(token)) || /\blo tienen\b|\btiene(n)?\b/.test(text)
  const exportAsk =
    /lista(do)? (completa? )?de precios|lista de precios|precios? completos/.test(text) ||
    (tokens.some((token) => LIST_CUES.has(token)) && priceAsk && useful.length === 0)
  const broadList =
    useful.length === 0 &&
    (existAsk || tokens.some((token) => LIST_CUES.has(token)) || /que productos|productos disponibles|que tienen/.test(text))

  if (kind === 'social' || kind === 'aside') {
    return skipPlan('desarrollo', 'none', 'alta')
  }

  if (kind === 'continue' && offersAreFresh(ctx) && !latest && useful.length === 0) {
    if (stockAsk) {
      const refresh = offerSearchText(ctx)
      if (refresh && chatHasAuth()) {
        const signature = `stock|${refresh}`
        if (signature === lastSignature && Date.now() - lastFetchedAt < QUERY_TTL_MS && cachedProducts.length) {
          return skipPlan('cache', 'stock', 'alta', { searchText: refresh, withStock: true, signature, uiSlot: 'producto' })
        }
        return {
          source: 'api',
          act: 'stock',
          confidence: 'alta',
          searchText: refresh,
          withStock: true,
          signature,
          uiSlot: 'producto',
          filterPayload: EMPTY_FILTER_PAYLOAD,
          filterLabel: '',
        }
      }
    }
    return skipPlan('sesion', 'followup', 'alta')
  }

  if (kind === 'continue' && (ctx.lastOffers?.length || 0) > 0 && useful.length === 0 && !latest) {
    const refresh = offerSearchText(ctx)
    if (refresh && chatHasAuth()) {
      const act: ProductAct = stockAsk ? 'stock' : 'precio'
      const signature = `${act}|${refresh}`
      if (signature === lastSignature && Date.now() - lastFetchedAt < QUERY_TTL_MS && cachedProducts.length) {
        return skipPlan('cache', act, 'alta', { searchText: refresh, withStock: stockAsk, signature, uiSlot: 'producto' })
      }
      return {
        source: 'api',
        act,
        confidence: 'alta',
        searchText: refresh,
        withStock: stockAsk,
        signature,
        uiSlot: 'producto',
        filterPayload: EMPTY_FILTER_PAYLOAD,
        filterLabel: '',
      }
    }
    return skipPlan('sesion', 'followup', 'media')
  }

  if (exportAsk) {
    return skipPlan('acote', 'export', 'alta')
  }

  if (latest) {
    if (!chatHasAuth()) return skipPlan('login', 'novedades', 'alta')
    const signature = 'novedades'
    if (signature === lastSignature && Date.now() - lastFetchedAt < QUERY_TTL_MS && cachedProducts.length) {
      return skipPlan('cache', 'novedades', 'alta', { signature })
    }
    return {
      source: 'api',
      act: 'novedades',
      confidence: 'alta',
      searchText: '',
      withStock: false,
      signature,
      uiSlot: 'none',
      filterPayload: EMPTY_FILTER_PAYLOAD,
      filterLabel: '',
    }
  }

  const ui = resolveCatalogUi(tokens, ctx)
  if (isFilterSlot(ui.slot)) {
    if (!chatHasAuth()) {
      return skipPlan('login', 'existe', 'alta', {
        uiSlot: ui.slot,
        filterPayload: ui.payload,
        filterLabel: ui.label,
      })
    }
    const hasIds = ui.payload.brands.length + ui.payload.categories.length + ui.payload.models.length > 0
    const needLexicon = !readGeneralFilterMemory() || !hasIds
    const signature = `filtro|${ui.slot}|${ui.payload.brands.join(',')}|${ui.payload.models.join(',')}|${ui.payload.categories.join(',')}|${ui.label}`
    if (!needLexicon) {
      return skipPlan('sesion', 'existe', 'alta', {
        uiSlot: ui.slot,
        filterPayload: ui.payload,
        filterLabel: ui.label,
        signature,
      })
    }
    return {
      source: 'api',
      act: 'existe',
      confidence: 'alta',
      searchText: '',
      withStock: false,
      signature: `filtro|${ui.slot}|lexicon`,
      uiSlot: ui.slot,
      filterPayload: ui.payload,
      filterLabel: ui.label,
    }
  }

  const findHelp =
    /que productos|buscar|busco|buscando|averiguar|encontrar|varios productos|diversos productos|catalogo/.test(text)

  if (!searchText && (broadList || findHelp || priceAsk || existAsk || stockAsk)) {
    return skipPlan('acote', 'listado', 'media')
  }

  if (!searchText) {
    return skipPlan('desarrollo', 'none', 'baja')
  }

  const act: ProductAct = looksLikeCode(useful[0] || '') && useful.length === 1
    ? 'existe'
    : priceAsk
      ? 'precio'
      : stockAsk
        ? 'stock'
        : existAsk
          ? 'existe'
          : 'existe'

  if (!chatHasAuth()) {
    return skipPlan('login', act, 'alta', {
      searchText,
      uiSlot: 'producto',
      filterPayload: ui.payload,
      filterLabel: ui.label,
    })
  }

  const signature = `${act}|${searchText}|${stockAsk ? 1 : 0}`
  if (signature === lastSignature && Date.now() - lastFetchedAt < QUERY_TTL_MS && cachedProducts.length) {
    return skipPlan('cache', act, 'alta', {
      searchText,
      withStock: stockAsk,
      signature,
      uiSlot: 'producto',
      filterPayload: ui.payload,
      filterLabel: ui.label,
    })
  }

  return {
    source: 'api',
    act,
    confidence: 'alta',
    searchText,
    withStock: stockAsk,
    signature,
    uiSlot: 'producto',
    filterPayload: ui.payload,
    filterLabel: ui.label,
  }
}

function matchFilterIds(
  options: Array<{ id: string, label: string }>,
  tokens: readonly string[],
) {
  const hits: string[] = []
  for (const option of options) {
    const label = String(option.label || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    if (!label) continue
    const parts = label.split(/[^a-z0-9]+/).filter((part) => part.length >= 3)
    if (tokens.some((token) => token === label || parts.includes(token) || label.includes(token))) {
      hits.push(String(option.id))
    }
  }
  return hits
}

async function loadMapped(
  loader: () => Promise<{ productos?: unknown[] }>,
): Promise<ProductRecord[]> {
  try {
    const result = await loader()
    return (result.productos || [])
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map(mapApiProductToRecord)
      .filter((item): item is ProductRecord => Boolean(item))
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return cachedProducts
    }
    lastFetchFailed = true
    return []
  }
}

async function resolveFilterIds(tokens: readonly string[], token: string, signal: AbortSignal) {
  const memory = readGeneralFilterMemory()
  if (memory) {
    return {
      brandIds: matchFilterIds(memory.marcas || [], tokens),
      categoryIds: matchFilterIds(memory.categorias || [], tokens),
      modelIds: matchFilterIds(memory.modelos || [], tokens),
    }
  }

  const filters = await getGeneralFilter({ token, signal }).catch(() => null)
  return {
    brandIds: matchFilterIds(filters?.marcas || [], tokens),
    categoryIds: matchFilterIds(filters?.categorias || [], tokens),
    modelIds: matchFilterIds(filters?.modelos || [], tokens),
  }
}

export function shouldHydrateChatProducts(
  tokens: readonly string[],
  kind: string,
  ctx: SessionContext,
  raw = '',
) {
  const plan = planProductQuery({ tokens, raw, ctx, kind })
  return plan.source === 'api'
}

export async function hydrateChatProducts({
  tokens,
  raw,
  ctx,
  kind,
}: {
  tokens: readonly string[]
  raw: string
  ctx: SessionContext
  kind: string
}) {
  const plan = planProductQuery({ tokens, raw, ctx, kind })
  lastPlan = plan
  lastFetchFailed = false

  if (plan.source !== 'api') {
    return
  }

  const token = getApiAuthToken()
  if (!token) {
    lastPlan = { ...plan, source: 'login' }
    cachedProducts = []
    return
  }

  abortController?.abort()
  const previous = inflight
  if (previous) {
    await previous.catch(() => undefined)
  }

  const controller = new AbortController()
  abortController = controller
  const useful = usefulTokens(tokens)
  const searchText = plan.searchText || sanitizeSearch(useful.join(' '))

  inflight = (async () => {
    if (!readGeneralFilterMemory()) {
      await getGeneralFilter({ token, signal: controller.signal }).catch(() => null)
    }

    const resolvedSearch = searchTextFromQuery(raw, tokens) || searchText

    if (plan.act === 'novedades') {
      cachedProducts = rankCatalogProducts(
        await loadMapped(() => getLatestInventoryProducts({
          token,
          signal: controller.signal,
        })),
        raw,
        undefined,
        { keepAll: true },
      )
      if (controller.signal.aborted) return
      lastSignature = plan.signature
      lastFetchedAt = Date.now()
      return
    }

    if (controller.signal.aborted) {
      return
    }

    if (isFilterSlot(plan.uiSlot)) {
      const ids = await resolveFilterIds(useful, token, controller.signal)
      if (controller.signal.aborted) {
        return
      }
      const payload = {
        brands: ids.brandIds,
        categories: ids.categoryIds,
        models: ids.modelIds,
      }
      const hasIds = payload.brands.length + payload.categories.length + payload.models.length > 0
      if (hasIds) {
        lastPlan = {
          ...plan,
          source: 'sesion',
          filterPayload: payload,
        }
        lastSignature = plan.signature
        lastFetchedAt = Date.now()
        return
      }
      const fallback = sanitizeSearch(plan.filterLabel || useful.join(' '))
      lastPlan = {
        ...plan,
        uiSlot: 'producto',
        searchText: fallback,
      }
      if (!fallback) {
        lastSignature = plan.signature
        lastFetchedAt = Date.now()
        return
      }
      cachedProducts = rankCatalogProducts(
        await loadMapped(() => searchInventoryProducts({
          token,
          search: fallback,
          signal: controller.signal,
        })),
        fallback,
      )
      if (controller.signal.aborted) return
      lastSignature = plan.signature
      lastFetchedAt = Date.now()
      return
    }

    if (!resolvedSearch) {
      cachedProducts = []
      lastSignature = plan.signature
      lastFetchedAt = Date.now()
      return
    }

    cachedProducts = rankCatalogProducts(
      await loadMapped(() => searchInventoryProducts({
        token,
        search: resolvedSearch,
        signal: controller.signal,
      })),
      raw || resolvedSearch,
    )
    if (controller.signal.aborted) return
    lastSignature = plan.signature
    lastFetchedAt = Date.now()
  })()

  try {
    await inflight
  } finally {
    inflight = null
    if (abortController === controller) {
      abortController = null
    }
  }
}
