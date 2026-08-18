import { apiRequest } from '@/shared/api'

export const PRODUCTS_PAGE_SIZE = 25
/** Filas visibles al abrir Marca / Categoría / Modelo (el resto, scroll interno). */
export const FILTER_OPTIONS_VISIBLE_IDLE = 10
/** Filas visibles al buscar en Marca / Categoría / Modelo (el resto, scroll interno). */
export const FILTER_OPTIONS_VISIBLE_SEARCH = 15
/** JSON de GET /api/v1/general/filter en memoria, máximo 3 minutos. */
export const FILTER_CACHE_TTL_MS = 3 * 60 * 1000

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

/** Query `last_id`: número si es id numérico; si no, el valor tal cual. */
function toLastIdQuery(lastId) {
  if (lastId == null || lastId === '') {
    return null
  }
  const numeric = Number(lastId)
  return Number.isFinite(numeric) ? numeric : lastId
}

function getRawProductId(product) {
  const value = product?.id ?? product?.id_producto ?? product?.idProducto
  if (value == null || value === '') {
    return null
  }
  return toLastIdQuery(value)
}

/**
 * GET /api/v1/inventory/products
 * Paginación por scroll: `last_id` + `limit`.
 * Primera página: solo `limit=25`. Siguientes: `last_id` = id del último producto obtenido.
 */
export async function getGeneral({
  token,
  lastId = null,
  limit = PRODUCTS_PAGE_SIZE,
} = {}) {
  const query = buildQuery({
    limit,
    last_id: toLastIdQuery(lastId),
  })

  const payload = await apiRequest(`/api/v1/inventory/products${query}`, {
    method: 'GET',
    token,
  })

  const productos = extractProducts(payload)
  const meta = payload?.meta && typeof payload.meta === 'object' ? payload.meta : {}
  const lastProduct = productos.length > 0 ? productos[productos.length - 1] : null
  const resolvedLastId = getRawProductId(lastProduct) ?? toLastIdQuery(lastId)
  const hasMore = typeof meta.has_more === 'boolean'
    ? meta.has_more
    : productos.length >= limit

  return {
    productos,
    lastId: resolvedLastId,
    nextCursor: resolvedLastId,
    limit,
    hasMore,
    meta,
    raw: payload,
  }
}

/**
 * GET /api/v1/inventory/products/search?search=<texto barra>
 * Ejemplo: /api/v1/inventory/products/search?search=aceite
 * Bearer token requerido.
 */
export async function searchInventoryProducts({
  token,
  search,
  signal,
} = {}) {
  const searchText = String(search ?? '').trim()
  if (!searchText) {
    return {
      productos: [],
      meta: {},
      raw: null,
      search: '',
    }
  }

  const qs = buildQuery({
    search: searchText,
  })
  const path = `/api/v1/inventory/products/search${qs}`

  try {
    const payload = await apiRequest(path, {
      method: 'GET',
      token,
      signal,
    })

    const productos = extractProducts(payload)
    const meta = payload?.meta && typeof payload.meta === 'object' ? payload.meta : {}

    return {
      productos,
      meta,
      raw: payload,
      search: searchText,
      path,
    }
  } catch (error) {
    // Sin coincidencias: algunos backends responden 404 → lista vacía.
    if (error?.name === 'ApiError' && error.status === 404) {
      return {
        productos: [],
        meta: {},
        raw: error.payload ?? null,
        search: searchText,
        path,
        emptyBy404: true,
      }
    }
    throw error
  }
}

/**
 * GET /api/v1/inventory/products/latest
 * Productos nuevos. Bearer token requerido.
 */
export async function getLatestInventoryProducts({
  token,
  signal,
} = {}) {
  const path = '/api/v1/inventory/products/latest'

  try {
    const payload = await apiRequest(path, {
      method: 'GET',
      token,
      signal,
    })

    const productos = extractProducts(payload)
    const meta = payload?.meta && typeof payload.meta === 'object' ? payload.meta : {}

    return {
      productos,
      meta,
      raw: payload,
      path,
    }
  } catch (error) {
    if (error?.name === 'ApiError' && error.status === 404) {
      return {
        productos: [],
        meta: {},
        raw: error.payload ?? null,
        path,
        emptyBy404: true,
      }
    }
    throw error
  }
}

function generalFilterList(payload, key) {
  const data = payload?.data ?? payload

  if (Array.isArray(data?.[key])) {
    return data[key]
  }

  return []
}

function mapFilterOption(entry, { idKeys, labelKeys }) {
  if (!entry || typeof entry !== 'object') {
    return null
  }

  let label = ''
  for (const key of labelKeys) {
    label = String(entry[key] ?? '').trim()
    if (label) {
      break
    }
  }
  if (!label) {
    return null
  }

  let id = label
  for (const key of idKeys) {
    if (entry[key] != null && String(entry[key]).trim()) {
      id = entry[key]
      break
    }
  }

  const image = String(entry.imagen ?? '').trim()

  return {
    id: String(id),
    label,
    ...(image ? { image } : {}),
  }
}

function mapGeneralFilterPayload(payload) {
  const categorias = generalFilterList(payload, 'categorias')
    .map((entry) => mapFilterOption(entry, {
      idKeys: ['id_categoria', 'id'],
      labelKeys: ['categoria', 'nombre'],
    }))
    .filter(Boolean)

  const marcas = generalFilterList(payload, 'marcas')
    .map((entry) => mapFilterOption(entry, {
      idKeys: ['id_marca', 'id'],
      labelKeys: ['marca', 'nombre'],
    }))
    .filter(Boolean)

  const modelos = generalFilterList(payload, 'modelos')
    .map((entry) => mapFilterOption(entry, {
      idKeys: ['id_modelo', 'id'],
      labelKeys: ['modelo', 'nombre'],
    }))
    .filter(Boolean)

  return { categorias, marcas, modelos }
}

const EMPTY_FILTER_LISTS = {
  categorias: [],
  marcas: [],
  modelos: [],
}

const EMPTY_FILTER_MEMORY = {
  raw: null,
  ...EMPTY_FILTER_LISTS,
  savedAt: 0,
}

let generalFilterMemory = { ...EMPTY_FILTER_MEMORY }

function writeGeneralFilterMemory(raw, lists) {
  generalFilterMemory = {
    raw,
    categorias: lists.categorias,
    marcas: lists.marcas,
    modelos: lists.modelos,
    savedAt: Date.now(),
  }
}

function clearGeneralFilterMemory() {
  generalFilterMemory = { ...EMPTY_FILTER_MEMORY }
}

/** Copia en memoria del JSON de filter, o null si expiró / no hay. */
export function readGeneralFilterMemory(now = Date.now()) {
  if (!generalFilterMemory.raw) {
    return null
  }

  if (now - generalFilterMemory.savedAt >= FILTER_CACHE_TTL_MS) {
    clearGeneralFilterMemory()
    return null
  }

  return generalFilterMemory
}

/**
 * GET /api/v1/general/filter
 * Guarda el JSON completo (categorías, marcas, modelos) en memoria (máx. 3 min).
 * Bearer = token de login.
 */
export async function getGeneralFilter({
  token,
  signal,
} = {}) {
  try {
    const payload = await apiRequest('/api/v1/general/filter', {
      method: 'GET',
      token,
      signal,
    })

    const lists = mapGeneralFilterPayload(payload)
    writeGeneralFilterMemory(payload, lists)

    return {
      ...lists,
      raw: payload,
    }
  } catch (error) {
    if (error?.name === 'ApiError' && error.status === 404) {
      writeGeneralFilterMemory(error.payload ?? { data: EMPTY_FILTER_LISTS }, EMPTY_FILTER_LISTS)
      return {
        ...EMPTY_FILTER_LISTS,
        raw: error.payload ?? null,
        emptyBy404: true,
      }
    }
    throw error
  }
}
