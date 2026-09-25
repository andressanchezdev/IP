import {
  pickProductFiscalFields,
  readProductCompra,
  readProductExento,
  readProductIvaRate,
} from '@/features/catalog/lib/productFiscalFields'

/**
 * Contrato POST /api/v1/inventory/carts:
 * {
 *   id_producto,      // id numérico del producto (NUNCA el codigo/barcode)
 *   cantidad,
 *   precio_unitario,
 *   compra,
 *   exento,
 *   iva,
 *   aplicacion,
 *   fecha             // "YYYY-MM-DD HH:mm:ss"
 * }
 *
 * No se envía `codigo`. id_producto ≠ codigo.
 */

export const CART_UNIT_PRICE_ERROR =
  'Este producto no puede ser agregado a carrito, error sobre su valor unitario'

export function toCartProductId(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return NaN
  }
  return numeric
}

export function toCartQuantity(value, fallback = 1) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback
  }
  return Math.floor(numeric)
}

export function toCartUnitPrice(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0
  }
  return numeric
}

/** Fecha local "YYYY-MM-DD HH:mm:ss" para el body del carrito. */
export function formatCartFecha(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) {
    return formatCartFecha(new Date())
  }
  const pad = (n) => String(n).padStart(2, '0')
  return [
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  ].join(' ')
}

/**
 * id_producto usable: solo id de inventario.
 * Preferencia: id → id_producto → idProducto → fallback.
 * Nunca codigo / reference / searching (el barcode no es el id).
 */
export function resolveCartProductId(product, fallbackId) {
  const codigoHints = {
    codigo: product?.codigo ?? product?.reference,
    reference: product?.reference,
  }
  const candidates = [
    product?.id,
    product?.id_producto,
    product?.idProducto,
    fallbackId,
  ]
  for (const value of candidates) {
    const id = toCartProductId(value)
    if (!Number.isFinite(id)) {
      continue
    }
    const asText = String(value).trim().toLowerCase()
    const code = String(codigoHints.codigo ?? '').trim().toLowerCase()
    const reference = String(codigoHints.reference ?? '').trim().toLowerCase()
    if (code && asText === code) {
      console.warn('[cart] Ignorando candidato id igual al codigo', { value, codigo: code })
      continue
    }
    if (reference && asText === reference) {
      console.warn('[cart] Ignorando candidato id igual a reference/codigo', { value, reference })
      continue
    }
    return id
  }
  return NaN
}

export function resolveCartUnitPrice(product) {
  return toCartUnitPrice(product?.precio ?? product?.price ?? product?.precio_unitario)
}

export function resolveCartStock(product) {
  const numeric = Number(product?.stock ?? product?.cantidad)
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0
  }
  return numeric
}

/** Campos fiscales + aplicacion desde producto/ítem de carrito. */
export function resolveCartPostExtras(source = {}) {
  const fiscal = pickProductFiscalFields(source)
  const iva = fiscal.iva ?? readProductIvaRate(source) ?? 0
  const exento = fiscal.exento ?? readProductExento(source) ?? 0
  const compra = fiscal.compra ?? readProductCompra(source) ?? 0
  const aplicacion = String(source?.aplicacion ?? '').trim()

  return {
    compra: Number.isFinite(Number(compra)) ? Number(compra) : 0,
    exento: Number(exento) ? 1 : 0,
    iva: Number.isFinite(Number(iva)) ? Number(iva) : 0,
    aplicacion,
  }
}

/**
 * Body exacto que viaja en el POST unitario a carrito.
 * Ejemplo Thunder:
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
 */
export function buildCartPostBody({
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
  const fromProduct = product ? resolveCartPostExtras(product) : null

  const body = {
    id_producto: toCartProductId(idProducto),
    cantidad: toCartQuantity(cantidad, 1),
    precio_unitario: toCartUnitPrice(precioUnitario),
    compra: toCartUnitPrice(
      compra != null ? compra : (fromProduct?.compra ?? 0),
    ),
    exento: Number(
      exento != null ? exento : (fromProduct?.exento ?? 0),
    ) ? 1 : 0,
    iva: toCartUnitPrice(
      iva != null ? iva : (fromProduct?.iva ?? 0),
    ),
    aplicacion: String(
      aplicacion != null ? aplicacion : (fromProduct?.aplicacion ?? ''),
    ),
    fecha: String(fecha || formatCartFecha(new Date())).trim(),
  }

  if (!Number.isFinite(body.id_producto)) {
    throw new Error('id_producto inválido')
  }
  if (!(body.precio_unitario > 0)) {
    throw new Error(CART_UNIT_PRICE_ERROR)
  }

  // Diagnóstico: detectar si por error el id parece el codigo del producto.
  const codeHint = String(product?.codigo ?? product?.reference ?? '').trim()
  if (codeHint && String(body.id_producto) === codeHint) {
    throw new Error(
      `id_producto no puede ser el codigo (${codeHint}). Usa el id de inventario.`,
    )
  }

  return body
}

/**
 * Gate real del POST /inventory/carts (confirmado live 2026-09-25):
 * solo acepta compra>0 + exento:1 + iva:19; luego persiste 0/0/0.
 * Productos con iva:0 + exento:1 (datos API) fallan con 400 Invalid data.
 * PUT no tiene este gate — no aplicar ahí.
 */
export function applyCartPostFiscalGate(body = {}) {
  const raw = {
    compra: body.compra,
    exento: body.exento,
    iva: body.iva,
  }
  const compra = Number(raw.compra)
  const normalized = {
    ...body,
    compra: Number.isFinite(compra) && compra > 0 ? compra : 1,
    exento: 1,
    iva: 19,
  }
  const wasAdjusted = (
    Number(raw.exento) !== 1
    || Number(raw.iva) !== 19
    || !(Number.isFinite(compra) && compra > 0)
  )
  return { body: normalized, raw, wasAdjusted }
}

/**
 * Misma regla para card, detalle, chat y carga masiva:
 * nuevas = min(pedida, stock); el POST envía existente + nuevas.
 * Masivo puede omitir extras fiscales; el body igual completa defaults.
 */
export function planCartAdd({
  idProducto,
  requestedQty,
  stock,
  existingQty = 0,
  precioUnitario,
  compra,
  exento,
  iva,
  aplicacion,
  fecha,
  product,
} = {}) {
  const stockNum = Math.max(0, Number(stock) || 0)
  const requested = Math.max(0, Number(requestedQty) || 0)
  const existing = Math.max(0, Number(existingQty) || 0)
  const orderQty = Math.min(requested, stockNum)
  const id = toCartProductId(idProducto)

  if (!Number.isFinite(id)) {
    return { ok: false, reason: 'id_producto inválido', orderQty: 0, body: null }
  }
  if (orderQty <= 0) {
    return { ok: false, reason: 'Sin stock disponible', orderQty: 0, body: null }
  }
  const unitPrice = toCartUnitPrice(precioUnitario)
  if (!(unitPrice > 0)) {
    return { ok: false, reason: CART_UNIT_PRICE_ERROR, orderQty: 0, body: null }
  }

  return {
    ok: true,
    orderQty,
    body: buildCartPostBody({
      idProducto: id,
      cantidad: existing + orderQty,
      precioUnitario: unitPrice,
      compra,
      exento,
      iva,
      aplicacion,
      fecha,
      product,
    }),
  }
}
