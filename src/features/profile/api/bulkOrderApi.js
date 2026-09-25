import { apiRequest } from '@/shared/api'
import { toMoneyNumber, wait } from './bulkShared'
import { getCatalogProductId } from '@/features/catalog/mappers/mapProduct'
import { stockTotal } from '@/features/catalog/mappers/parseUbicacionStock'
import { postCartCheckMassive } from '@/features/cart/api/cartApi'

/** Lotes de resolución codigo→id (search). El stock lo define check-massive. */
export const STOCK_BATCH_SIZE = 20
/** Ventana de ritmo: 20 peticiones repartidas en 15s (~750ms entre cada una). */
export const STOCK_BATCH_WINDOW_MS = 15_000

export const STOCK_STATUS = {
  OK: 'Ok',
  SHORT: 'con novedad',
  OUT: 'agotado',
}

function extractProducts(payload) {
  const data = payload?.data ?? payload
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.productos)) return data.productos
  if (Array.isArray(data?.products)) return data.products
  return []
}

/**
 * Resuelve codigo → { id, precio } vía search.
 * El stock autoritativo viene después de check-massive (no de este GET).
 */
async function resolveProductByCode(codigo) {
  const code = String(codigo ?? '').trim()
  if (!code) {
    return { codigo: '', id: null, precio: 0 }
  }

  const codeKey = code.toLowerCase()

  try {
    const payload = await apiRequest(
      `/api/v1/inventory/products/search?search=${encodeURIComponent(code)}`,
      { method: 'GET' },
    )
    const productos = extractProducts(payload)
    const match = productos.find(
      (product) => String(product?.codigo ?? '').trim().toLowerCase() === codeKey,
    )

    if (!match) {
      return { codigo: code, id: null, precio: 0 }
    }

    return {
      codigo: code,
      id: getCatalogProductId(match),
      precio: toMoneyNumber(match.precio),
    }
  } catch (error) {
    if (error?.name === 'ApiError' && error.status === 404) {
      return { codigo: code, id: null, precio: 0 }
    }
    throw error
  }
}

/**
 * Resuelve ids de producto por código (ritmo controlado).
 * Ya no usa el stock del search para la comparación final.
 */
export async function resolveProductIdsByCodes(
  codes,
  {
    batchSize = STOCK_BATCH_SIZE,
    batchWindowMs = STOCK_BATCH_WINDOW_MS,
    onProgress,
  } = {},
) {
  const list = Array.isArray(codes) ? codes : []
  const byCode = new Map()
  let processed = 0
  const size = Math.max(1, Number(batchSize) || STOCK_BATCH_SIZE)
  const windowMs = Math.max(0, Number(batchWindowMs) || STOCK_BATCH_WINDOW_MS)

  onProgress?.(0, list.length)

  for (let i = 0; i < list.length; i += size) {
    const batch = list.slice(i, i + size)
    const batchDurationMs = Math.round((batch.length / size) * windowMs)
    const stepMs = batch.length > 0
      ? Math.floor(batchDurationMs / batch.length)
      : 0

    for (let j = 0; j < batch.length; j += 1) {
      const startedAt = Date.now()
      const { codigo, id, precio } = await resolveProductByCode(batch[j])
      byCode.set(codigo, { id, precio })

      processed += 1
      onProgress?.(processed, list.length)

      if (j < batch.length - 1) {
        const elapsed = Date.now() - startedAt
        await wait(Math.max(0, stepMs - elapsed))
      }
    }
  }

  return byCode
}

/** @deprecated Prefer resolveProductIdsByCodes + check-massive. */
export async function fetchStockByCodes(codes, options = {}) {
  return resolveProductIdsByCodes(codes, options)
}

function toSafeStock(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0
  }
  return numeric
}

function normalizeEstadoLabel(value) {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return null
  if (text === 'ok' || text === 'disponible' || text === 'sufficient') {
    return STOCK_STATUS.OK
  }
  if (
    text.includes('novedad')
    || text.includes('parcial')
    || text.includes('short')
    || text.includes('insuficiente')
  ) {
    return STOCK_STATUS.SHORT
  }
  if (
    text.includes('agotado')
    || text.includes('sin stock')
    || text.includes('out')
    || text.includes('no encontrado')
    || text.includes('not found')
  ) {
    return STOCK_STATUS.OUT
  }
  return null
}

function extractCheckRows(payload) {
  const data = payload?.data ?? payload
  if (Array.isArray(data)) {
    return data
  }
  if (!data || typeof data !== 'object') {
    return []
  }

  const buckets = []
  const pushBucket = (list, forcedEstado = null) => {
    if (!Array.isArray(list)) return
    list.forEach((row) => {
      buckets.push(forcedEstado ? { ...row, __forcedEstado: forcedEstado } : row)
    })
  }

  // Formas posibles: lista plana o agrupada por estado.
  pushBucket(data.productos)
  pushBucket(data.products)
  pushBucket(data.items)
  pushBucket(data.resultados)
  pushBucket(data.results)
  pushBucket(data.ok ?? data.Ok ?? data.disponibles, STOCK_STATUS.OK)
  pushBucket(data.novedad ?? data.novedades ?? data.short, STOCK_STATUS.SHORT)
  pushBucket(data.agotado ?? data.agotados ?? data.out, STOCK_STATUS.OUT)

  if (buckets.length > 0) {
    return buckets
  }

  return []
}

function resolveRowEstado(row, cantidad, stock) {
  if (row?.__forcedEstado) {
    return row.__forcedEstado
  }
  const labeled = normalizeEstadoLabel(
    row?.estado ?? row?.status ?? row?.novedad ?? row?.resultado,
  )
  if (labeled) {
    return labeled
  }
  if (stock <= 0) {
    return STOCK_STATUS.OUT
  }
  if (stock < cantidad) {
    return STOCK_STATUS.SHORT
  }
  return STOCK_STATUS.OK
}

/**
 * Une pedido Excel + ids resueltos + respuesta de check-massive
 * → misma forma que compareOrderWithStock (Ok / con novedad / agotado).
 */
export function mapCheckMassiveToComparison(items = [], resolvedByCode = new Map(), checkPayload = null) {
  const checkRows = extractCheckRows(checkPayload)
  const byProductId = new Map()

  checkRows.forEach((row) => {
    const id = String(
      row?.id_producto
      ?? row?.idProducto
      ?? row?.id
      ?? '',
    ).trim()
    if (!id) return
    byProductId.set(id, row)
  })

  const results = items.map((item) => {
    const codigo = String(item?.codigo ?? '')
    const cantidad = Number(item?.cantidad) || 0
    const resolved = resolvedByCode.get(codigo)
    const id = resolved?.id != null ? String(resolved.id) : null
    const precio = toMoneyNumber(resolved?.precio)

    if (!id) {
      return {
        codigo,
        cantidad,
        stock: 0,
        estado: STOCK_STATUS.OUT,
        id: null,
        precio: 0,
      }
    }

    const checkRow = byProductId.get(id)
    const stock = checkRow
      ? toSafeStock(
        checkRow.stock
        ?? checkRow.disponible
        ?? checkRow.cantidad_disponible
        ?? checkRow.stock_disponible
        ?? stockTotal(checkRow.stock),
      )
      : 0

    const estado = checkRow
      ? resolveRowEstado(checkRow, cantidad, stock)
      : STOCK_STATUS.OUT

    return {
      codigo,
      cantidad,
      stock,
      estado,
      id,
      precio,
    }
  })

  return {
    results,
    summary: {
      ok: results.filter((row) => row.estado === STOCK_STATUS.OK).length,
      novedad: results.filter((row) => row.estado === STOCK_STATUS.SHORT).length,
      agotado: results.filter((row) => row.estado === STOCK_STATUS.OUT).length,
    },
    checkRequest: null,
    checkRaw: checkPayload,
  }
}

/**
 * Flujo subida masiva:
 * 1) Excel códigos+cantidad
 * 2) Resolver id_producto por search
 * 3) POST check-massive { productos: [{ id_producto, cantidad }] }
 * 4) Comparación Ok / con novedad / agotado
 */
export async function compareBulkOrderWithCheckMassive(
  items = [],
  {
    token,
    onProgress,
  } = {},
) {
  const list = Array.isArray(items) ? items : []
  const resolvedByCode = await resolveProductIdsByCodes(
    list.map((item) => item.codigo),
    { onProgress },
  )

  const productos = list
    .map((item) => {
      const codigo = String(item?.codigo ?? '')
      const resolved = resolvedByCode.get(codigo)
      const id = resolved?.id
      if (id == null || id === '') {
        return null
      }
      return {
        id_producto: id,
        cantidad: Number(item?.cantidad) || 0,
        codigo,
      }
    })
    .filter((entry) => entry && entry.cantidad > 0)

  if (productos.length === 0) {
    return mapCheckMassiveToComparison(list, resolvedByCode, { productos: [] })
  }

  const checked = await postCartCheckMassive({
    token,
    productos,
  })

  const comparison = mapCheckMassiveToComparison(list, resolvedByCode, checked.raw)
  comparison.checkRequest = checked.request
  return comparison
}

/**
 * Compara pedido vs stock local (legacy / tests).
 * Preferir compareBulkOrderWithCheckMassive en subida masiva.
 */
export function compareOrderWithStock(items = [], stockByCode = new Map()) {
  const results = items.map((item) => {
    const codigo = String(item?.codigo ?? '')
    const cantidad = Number(item?.cantidad) || 0
    const entry = stockByCode.get(codigo)
    const stock = typeof entry === 'number' ? entry : (entry?.stock ?? 0)
    const id = typeof entry === 'object' && entry ? entry.id : null
    const precio = typeof entry === 'object' && entry ? toMoneyNumber(entry.precio) : 0

    let estado = STOCK_STATUS.OK
    if (stock <= 0) {
      estado = STOCK_STATUS.OUT
    } else if (stock < cantidad) {
      estado = STOCK_STATUS.SHORT
    }

    return { codigo, cantidad, stock, estado, id, precio }
  })

  return {
    results,
    summary: {
      ok: results.filter((row) => row.estado === STOCK_STATUS.OK).length,
      novedad: results.filter((row) => row.estado === STOCK_STATUS.SHORT).length,
      agotado: results.filter((row) => row.estado === STOCK_STATUS.OUT).length,
    },
  }
}

/**
 * Continuar → Ok + con novedad (excluye agotado).
 * Continuar sin novedad → solo Ok.
 */
export function selectRowsForCart(results = [], { onlyOk = false } = {}) {
  const rows = Array.isArray(results) ? results : []
  if (onlyOk) {
    return rows.filter((row) => row.estado === STOCK_STATUS.OK)
  }
  return rows.filter((row) => row.estado !== STOCK_STATUS.OUT)
}

/**
 * Filas que no se envían y deben quedar en Informacion.
 */
export function selectRowsExcludedFromCart(results = [], { onlyOk = false } = {}) {
  const rows = Array.isArray(results) ? results : []
  if (onlyOk) {
    return rows.filter((row) => row.estado !== STOCK_STATUS.OK)
  }
  return rows.filter((row) => row.estado === STOCK_STATUS.OUT)
}
