import { apiRequest } from '@/shared/api'

const CART_PAGE_SIZE = 50
const CARTS_PATH = '/api/v1/inventory/carts'
const CARTS_PATH_MASSIVE = '/api/v1/inventory/carts/massive'

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

function toPositiveCartQuantity(value, fallback = 1) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback
  }
  return Math.floor(numeric)
}

function toMoneyNumber(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0
  }
  return numeric
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
 *   "id_producto": 9,
 *   "cantidad": 10,
 *   "precio_unitario": 15000
 * }
 */
export async function postCartItem({
  token,
  idProducto,
  cantidad,
  precioUnitario,
} = {}) {
  const body = {
    id_producto: Number(idProducto),
    cantidad: toPositiveCartQuantity(cantidad, 1),
    precio_unitario: toMoneyNumber(precioUnitario),
  }

  if (!Number.isFinite(body.id_producto)) {
    throw new Error('id_producto inválido')
  }

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