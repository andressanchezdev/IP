import { apiRequest } from '@/shared/api'

export const PRODUCTS_PAGE_SIZE = 25

function buildQuery(params = {}) {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    search.set(key, String(value))
  })

  const query = search.toString()
  return query ? `?${query}` : ''
}

function extractProducts(payload) {
  const data = payload?.data ?? payload

  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.productos)) {
    return data.productos
  }

  if (Array.isArray(data?.products)) {
    return data.products
  }

  return []
}

/**
 * GET /api/v1/inventory/products
 * Paginación por cursor: `last_id` + `limit`.
 */
export async function getGeneral({
  token,
  lastId = null,
  limit = PRODUCTS_PAGE_SIZE,
} = {}) {
  const query = buildQuery({
    limit,
    last_id: lastId,
  })

  const payload = await apiRequest(`/api/v1/inventory/products${query}`, {
    method: 'GET',
    token,
  })

  const productos = extractProducts(payload)
  const meta = payload?.meta && typeof payload.meta === 'object' ? payload.meta : {}
  const lastProduct = productos.length > 0 ? productos[productos.length - 1] : null
  const resolvedLastId = lastProduct?.id ?? lastId ?? null
  const nextCursor = meta.next_cursor ?? resolvedLastId
  const hasMore = typeof meta.has_more === 'boolean'
    ? meta.has_more
    : productos.length >= limit

  return {
    productos,
    lastId: resolvedLastId,
    nextCursor,
    limit,
    hasMore,
    meta,
    raw: payload,
  }
}

export const getInventoryProducts = getGeneral
