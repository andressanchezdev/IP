import { apiRequest } from '@/shared/api'
import { auditProductFiscalFields } from '@/features/catalog/lib/auditProductFiscalFields'
import { buildCartPostBody } from './cartPostBody'

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
  const body = buildCartPostBody({
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

  const payload = await apiRequest(CARTS_PATH, {
    method: 'POST',
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
 * PUT /api/v1/inventory/carts
 * Actualiza la cantidad de un ítem ya en carrito.
 *
 * Cuerpo de prueba (misma forma que POST, orientado a actualizar cantidad):
 * {
 *   "id_producto": 7704790200048,
 *   "cantidad": 3,
 *   "precio_unitario": 28000
 * }
 *
 * `cantidad` = nueva cantidad total de la línea (no delta).
 */
export async function putCartItem({
  token,
  idProducto,
  cantidad,
  precioUnitario,
} = {}) {
  const body = buildCartPostBody({ idProducto, cantidad, precioUnitario })

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

/**
 * DELETE /api/v1/inventory/carts
 * Elimina un ítem del carrito (uno por petición).
 *
 * Body:
 * {
 *   "id_carrito": 276934
 * }
 */
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
