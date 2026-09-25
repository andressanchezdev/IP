import { apiRequest } from '@/shared/api'
import { auditProductFiscalFields } from '@/features/catalog/lib/auditProductFiscalFields'
import { applyCartPostFiscalGate, buildCartPostBody } from './cartPostBody'

const CART_PAGE_SIZE = 50
const CARTS_PATH = '/api/v1/inventory/carts'
const CARTS_PATH_MASSIVE = '/api/v1/inventory/carts/massive'
const CARTS_PATH_CHECK_MASSIVE = '/api/v1/inventory/carts/check-massive'

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

function extractCarts(payload) {
  const data = payload?.data ?? payload

  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.carritos)) {
    return data.carritos
  }

  if (Array.isArray(data?.carts)) {
    return data.carts
  }

  if (data?.carrito && typeof data.carrito === 'object' && !Array.isArray(data.carrito)) {
    return [data.carrito]
  }

  if (
    data
    && typeof data === 'object'
    && (data.id_producto != null || data.id_carrito != null)
  ) {
    return [data]
  }

  return []
}

/**
 * GET /api/v1/inventory/carts
 * Carrito del usuario autenticado (ítems con datos de producto embebidos).
 */
export async function getCart({
  token,
  lastId = null,
  limit = CART_PAGE_SIZE,
} = {}) {
  const query = buildQuery({
    limit,
    last_id: lastId,
  })

  const payload = await apiRequest(`${CARTS_PATH}${query}`, {
    method: 'GET',
    token,
  })

  const carritos = extractCarts(payload)
  auditProductFiscalFields(carritos, 'cart')
  const meta = payload?.meta && typeof payload.meta === 'object' ? payload.meta : {}

  return {
    carritos,
    meta,
    hasMore: Boolean(meta.has_more),
    nextCursor: meta.next_cursor ?? null,
    limit: meta.limit ?? limit,
    raw: payload,
  }
}

/**
 * POST /api/v1/inventory/carts
 * Upsert de ítem en carrito del usuario autenticado.
 *
 * Body:
 * {
 *   "id_producto": 2,
 *   "cantidad": 1,
 *   "precio_unitario": 28000,
 *   "compra": 16275.64,
 *   "exento": 1,
 *   "iva": 19,
 *   "aplicacion": "json",
 *   "fecha": "2026-09-25 10:15:00"
 * }
 *
 * `id_producto` = id de inventario (nunca el codigo/barcode).
 */
export async function postCartItem({
  token,
  idProducto,
  cantidad,
  precioUnitario,
  compra,
  exento,
  iva,
  aplicacion,
  fecha,
  product,
} = {}) {
  const plannedBody = buildCartPostBody({
    idProducto,
    cantidad,
    precioUnitario,
    compra,
    exento,
    iva,
    aplicacion,
    fecha,
    product,
  })
  // Solo POST: el API rechaza iva/exento/compra del producto si no pasan el gate.
  const { body, raw, wasAdjusted } = applyCartPostFiscalGate(plannedBody)

  console.info('[cart POST]', {
    path: CARTS_PATH,
    method: 'POST',
    productId: product?.id ?? idProducto,
    productCodigo: product?.codigo ?? product?.reference ?? null,
    fiscalFromProduct: {
      compra: product?.compra ?? null,
      exento: product?.exento ?? null,
      iva: product?.iva ?? null,
    },
    bodyBeforeGate: { ...plannedBody, compra: raw.compra, exento: raw.exento, iva: raw.iva },
    bodySent: body,
    fiscalGateAdjusted: wasAdjusted,
  })

  try {
    const payload = await apiRequest(CARTS_PATH, {
      method: 'POST',
      token,
      body,
    })

    console.info('[cart POST ok]', {
      productId: body.id_producto,
      response: payload,
    })

    const carritos = extractCarts(payload)
    const meta = payload?.meta && typeof payload.meta === 'object' ? payload.meta : {}

    return {
      carritos,
      item: carritos[0] ?? null,
      meta,
      raw: payload,
      request: body,
    }
  } catch (error) {
    console.error('[cart POST fail]', {
      status: error?.status,
      payload: error?.payload,
      bodySent: body,
      fiscalFromProduct: {
        compra: product?.compra ?? null,
        exento: product?.exento ?? null,
        iva: product?.iva ?? null,
      },
    })
    throw error
  }
}

/**
 * PUT /api/v1/inventory/carts
 * Actualiza el contenido de una línea existente del carrito.
 *
 * Body:
 * {
 *   "id_carrito": 276934,
 *   "id_producto": 2,
 *   "cantidad": 3,
 *   "precio_unitario": 28000,
 *   "compra": 16275.64,
 *   "exento": 1,
 *   "iva": 19,
 *   "aplicacion": "json",
 *   "fecha": "2026-09-25 10:15:00"
 * }
 *
 * `id_carrito` identifica la línea a actualizar.
 * `cantidad` = nueva cantidad total de la línea (no delta).
 */
export async function putCartItem({
  token,
  idCarrito,
  idProducto,
  cantidad,
  precioUnitario,
  compra,
  exento,
  iva,
  aplicacion,
  fecha,
  product,
} = {}) {
  const cartId = Number(idCarrito)
  if (!Number.isFinite(cartId) || cartId <= 0) {
    throw new Error('id_carrito inválido')
  }

  const body = {
    id_carrito: cartId,
    ...buildCartPostBody({
      idProducto,
      cantidad,
      precioUnitario,
      compra,
      exento,
      iva,
      aplicacion,
      fecha,
      product,
    }),
  }

  const payload = await apiRequest(CARTS_PATH, {
    method: 'PUT',
    token,
    body,
  })

  if (payload?.error) {
    throw new Error(payload.error)
  }

  const carritos = extractCarts(payload)
  const meta = payload?.meta && typeof payload.meta === 'object' ? payload.meta : {}

  return {
    carritos,
    item: carritos[0] ?? null,
    meta,
    raw: payload,
    request: body,
  }
}

export async function deleteCartItem({
  token,
  idCarrito,
} = {}) {
  const cartId = Number(idCarrito)
  if (!Number.isFinite(cartId)) {
    throw new Error('id_carrito inválido')
  }

  const body = {
    id_carrito: cartId,
  }

  const payload = await apiRequest(CARTS_PATH, {
    method: 'DELETE',
    token,
    body,
  })

  const carritos = extractCarts(payload)
  const meta = payload?.meta && typeof payload.meta === 'object' ? payload.meta : {}

  return {
    carritos,
    item: carritos[0] ?? null,
    meta,
    raw: payload,
    request: body,
  }
}

/**
 * DELETE /api/v1/inventory/carts/massive
 * Vacía todo el carrito del usuario en una sola petición.
 * Body: { "type": "all" }
 * El backend emite WS `stock eliminarTodo` para actualizar stock en catálogo.
 */
export async function deleteMassiveCartItems({
  token,
} = {}) {
  const body = {
    type: 'all',
  }
  const payload = await apiRequest(CARTS_PATH_MASSIVE, {
    method: 'DELETE',
    token,
    body,
  })
  if (payload?.error) {
    throw new Error(payload.error)
  }
  return {
    raw: payload,
    request: body,
  }
}

/**
 * POST /api/v1/inventory/carts/check-massive
 * Consulta stock masivo (subida Excel): productos con cantidad pedida.
 *
 * Body:
 * {
 *   "productos": [
 *     { "id_producto": 2, "cantidad": 10 },
 *     { "id_producto": 5, "cantidad": 3 }
 *   ]
 * }
 */
export function buildCartCheckMassiveBody(productos = []) {
  const list = (Array.isArray(productos) ? productos : [])
    .map((entry) => {
      const idProducto = Number(entry?.id_producto ?? entry?.idProducto ?? entry?.id)
      const cantidad = Math.floor(Number(entry?.cantidad ?? entry?.quantity) || 0)
      if (!Number.isFinite(idProducto) || idProducto <= 0 || cantidad <= 0) {
        return null
      }
      return {
        id_producto: idProducto,
        cantidad,
      }
    })
    .filter(Boolean)

  return { productos: list }
}

export async function postCartCheckMassive({
  token,
  productos,
  signal,
} = {}) {
  const body = buildCartCheckMassiveBody(productos)
  if (body.productos.length === 0) {
    throw new Error('Sin productos válidos para check-massive')
  }

  const payload = await apiRequest(CARTS_PATH_CHECK_MASSIVE, {
    method: 'POST',
    token,
    body,
    signal,
  })

  if (payload?.error) {
    throw new Error(payload.error)
  }

  return {
    raw: payload,
    request: body,
    data: payload?.data ?? payload,
  }
}
