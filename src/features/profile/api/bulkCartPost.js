import { getApiAuthToken } from '@/shared/api'
import { postCartItem, putCartItem } from '@/features/cart/api/cartApi'
import { planCartAdd } from '@/features/cart/api/cartPostBody'
import { runWithConcurrency } from './bulkShared'

/** Concurrencia moderada para no saturar POST/PUT /inventory/carts. */
export const CART_POST_CONCURRENCY = 3

function productFromBulkRow(row) {
  return {
    id: row?.id,
    stock: row?.stock,
    precio: row?.precio,
    price: row?.precio,
    compra: row?.compra,
    iva: row?.iva,
    exento: row?.exento,
    aplicacion: row?.aplicacion,
  }
}

/**
 * Envía filas Excel al carrito:
 * - id ya en carrito + id_carrito → PUT (actualizar cantidad total)
 * - id nuevo → POST
 */
export async function postBulkOrderToCart(
  rows = [],
  {
    token,
    getExistingQty,
    getExistingCartId,
    onProgress,
    concurrency = CART_POST_CONCURRENCY,
  } = {},
) {
  const authToken = token || getApiAuthToken()
  if (!authToken) {
    throw new Error('Sesión requerida para enviar al carrito')
  }

  const list = Array.isArray(rows) ? rows : []
  const posted = []
  const failed = []
  const plannedQtyById = new Map()
  let done = 0

  onProgress?.(0, list.length)

  list.forEach((row) => {
    const product = productFromBulkRow(row)
    const planned = planCartAdd({
      idProducto: row?.id,
      requestedQty: row?.cantidad,
      stock: row?.stock,
      existingQty: plannedQtyById.has(String(row?.id))
        ? plannedQtyById.get(String(row?.id))
        : Number(getExistingQty?.(String(row?.id)) || 0),
      precioUnitario: row?.precio,
      product,
    })
    if (!planned.ok) return
    plannedQtyById.set(String(row.id), planned.body.cantidad)
  })

  await runWithConcurrency(list, concurrency, async (row) => {
    const productId = row?.id != null ? String(row.id) : ''
    const existingQty = Number(getExistingQty?.(productId) || 0)
    const existingCartId = getExistingCartId?.(productId)
    const product = productFromBulkRow(row)
    const planned = planCartAdd({
      idProducto: row?.id,
      requestedQty: row?.cantidad,
      stock: row?.stock,
      existingQty,
      precioUnitario: row?.precio,
      product,
    })

    if (!planned.ok) {
      failed.push({
        codigo: row?.codigo,
        reason: planned.reason,
        request: planned.body,
      })
      done += 1
      onProgress?.(done, list.length)
      return
    }

    const requestBody = {
      ...planned.body,
      cantidad: plannedQtyById.get(productId) ?? planned.body.cantidad,
    }

    try {
      // Ya en carrito → solo PUT. POST de nuevo provoca 400.
      if (existingCartId != null && existingCartId !== '') {
        await putCartItem({
          token: authToken,
          idCarrito: existingCartId,
          idProducto: requestBody.id_producto,
          cantidad: requestBody.cantidad,
          precioUnitario: requestBody.precio_unitario,
          compra: requestBody.compra,
          exento: requestBody.exento,
          iva: requestBody.iva,
          aplicacion: requestBody.aplicacion,
          fecha: requestBody.fecha,
          product,
        })
      } else if (existingQty > 0) {
        failed.push({
          codigo: row?.codigo,
          reason: 'Producto ya en carrito sin id_carrito; recarga el carrito',
          request: requestBody,
        })
        done += 1
        onProgress?.(done, list.length)
        return
      } else {
        await postCartItem({
          token: authToken,
          idProducto: requestBody.id_producto,
          cantidad: requestBody.cantidad,
          precioUnitario: requestBody.precio_unitario,
          compra: requestBody.compra,
          exento: requestBody.exento,
          iva: requestBody.iva,
          aplicacion: requestBody.aplicacion,
          fecha: requestBody.fecha,
          product,
        })
      }
      posted.push({
        codigo: row.codigo,
        cantidad: planned.orderQty,
        id: productId,
        request: requestBody,
        method: existingCartId ? 'PUT' : 'POST',
      })
    } catch (error) {
      failed.push({
        codigo: row?.codigo,
        reason: error?.message || 'Error al agregar al carrito',
        request: requestBody,
      })
    }

    done += 1
    onProgress?.(done, list.length)
  })

  return { posted, failed }
}
