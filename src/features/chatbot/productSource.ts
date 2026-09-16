import {
  getLatestInventoryProducts,
  getGeneralFilter,
  postInventoryProductsFilter,
  searchInventoryProducts,
} from '@/features/catalog/api/generalApi'
import { getApiAuthToken } from '@/shared/api'
import { buildProductsFilterBody } from '@/features/catalog/utils/catalogFilters'
import type { SessionContext } from './sessionContext'
import type { ProductRecord } from './types'

const GENERIC = new Set([
  'producto',
  'productos',
  'catalogo',
  'pieza',
  'repuesto',
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

const LATEST_CUES = new Set(['nuevo', 'nuevos', 'novedad', 'novedades', 'reciente', 'recientes'])
const STOCK_CUES = new Set(['stock', 'existencia', 'existencias', 'disponible', 'disponibles', 'cantidad'])

let cachedProducts: ProductRecord[] = []
let inflight: Promise<void> | null = null
let abortController: AbortController | null = null

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

export function mapApiProductToRecord(product: Record<string, unknown>): ProductRecord | null {
  const id = String(product?.id ?? product?.id_producto ?? '').trim()
  const nombre = String(product?.descripcion ?? product?.nombre ?? product?.description ?? '').trim()
  if (!id && !nombre) {
    return null
  }
  const precio = Number(product?.precio ?? product?.price ?? 0)
  const stock = Number(product?.stock ?? product?.cantidad ?? 0)
  return {
    id: id || nombre,
    codigo: String(product?.codigo ?? product?.reference ?? '').trim(),
    nombre: nombre || String(product?.codigo ?? id),
    descripcion: nombre,
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
  }
}

function usefulTokens(tokens: readonly string[]) {
  return tokens.filter((token) => token.length >= 3 && !GENERIC.has(token))
}

function wantsLatest(tokens: readonly string[], raw: string) {
  const folded = raw.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  return tokens.some((token) => LATEST_CUES.has(token)) || /\bnuevos?\b/.test(folded)
}

function wantsStockOnly(tokens: readonly string[]) {
  return tokens.some((token) => STOCK_CUES.has(token))
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

export function shouldHydrateChatProducts(
  tokens: readonly string[],
  kind: string,
  ctx: SessionContext,
) {
  if (kind === 'social' || kind === 'aside') {
    return false
  }
  if (kind === 'continue' && (ctx.lastOffers?.length || 0) > 0) {
    return false
  }
  return usefulTokens(tokens).length > 0
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
    return []
  }
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
  if (!shouldHydrateChatProducts(tokens, kind, ctx)) {
    return
  }

  const token = getApiAuthToken()
  if (!token) {
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
  const searchText = useful.join(' ').trim() || String(raw || '').trim()

  inflight = (async () => {
    if (wantsLatest(tokens, raw)) {
      cachedProducts = await loadMapped(() => getLatestInventoryProducts({
        token,
        signal: controller.signal,
      }))
      return
    }

    const filters = await getGeneralFilter({ token, signal: controller.signal }).catch(() => null)
    const brandIds = matchFilterIds(filters?.marcas || [], tokens)
    const categoryIds = matchFilterIds(filters?.categorias || [], tokens)
    const modelIds = matchFilterIds(filters?.modelos || [], tokens)
    const hasIds = brandIds.length > 0 || categoryIds.length > 0 || modelIds.length > 0

    if (hasIds) {
      const body = buildProductsFilterBody({
        brands: brandIds,
        categories: categoryIds,
        models: modelIds,
        modes: {
          brands: brandIds.length ? 'custom' : 'all',
          categories: categoryIds.length ? 'custom' : 'all',
          models: modelIds.length ? 'custom' : 'all',
        },
        withStock: wantsStockOnly(tokens),
      })
      cachedProducts = await loadMapped(() => postInventoryProductsFilter({
        token,
        body,
        signal: controller.signal,
      }))
      if (cachedProducts.length > 0) {
        return
      }
    }

    if (!searchText) {
      cachedProducts = []
      return
    }

    cachedProducts = await loadMapped(() => searchInventoryProducts({
      token,
      search: searchText,
      signal: controller.signal,
    }))
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
