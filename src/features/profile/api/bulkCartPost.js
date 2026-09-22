import { getApiAuthToken } from '@/shared/api'
import { postCartItem } from '@/features/cart/api/cartApi'
import { planCartAdd } from '@/features/cart/api/cartPostBody'
import { runWithConcurrency } from './bulkShared'

/** Concurrencia de POST /inventory/carts para acelerar el envío masivo. */
export const CART_POST_CONCURRENCY = 5

/**
 * POST /api/v1/inventory/carts con Bearer token.
 * Mismo body que Ordenar / chat: { id_producto, cantidad, precio_unitario }
 */
export async function postBulkOrderToCart(
  rows = [],
  {
    token,
    getExistingQty,
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
    const planned = planCartAdd({
      idProducto: row?.id,
      requestedQty: row?.cantidad,
      stock: row?.stock,
      existingQty: plannedQtyById.has(String(row?.id))
        ? plannedQtyById.get(String(row?.id))
        : Number(getExistingQty?.(String(row?.id)) || 0),
      precioUnitario: row?.precio,
    })
    if (!planned.ok) return
    plannedQtyById.set(String(row.id), planned.body.cantidad)
  })

  await runWithConcurrency(list, concurrency, async (row) => {
    const productId = row?.id != null ? String(row.id) : ''
    const existingQty = Number(getExistingQty?.(productId) || 0)
    const planned = planCartAdd({
      idProducto: row?.id,
      requestedQty: row?.cantidad,
      stock: row?.stock,
      existingQty,
      precioUnitario: row?.precio,
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
      await postCartItem({
        token: authToken,
        idProducto: requestBody.id_producto,
        cantidad: requestBody.cantidad,
        precioUnitario: requestBody.precio_unitario,
      })
      posted.push({
        codigo: row.codigo,
        cantidad: planned.orderQty,
        id: productId,
        request: requestBody,
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
