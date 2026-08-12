import { getApiAuthToken } from '@/shared/api'
import { postCartItem } from '@/features/cart/api/cartApi'
import { runWithConcurrency, toMoneyNumber } from './bulkShared'

/** Concurrencia de POST /inventory/carts para acelerar el envío masivo. */
export const CART_POST_CONCURRENCY = 5

/**
 * POST /api/v1/inventory/carts con Bearer token.
 * Body por producto: { id_producto, cantidad, precio_unitario }
 * Un POST distinto por cada fila seleccionada (id distinto por código Excel).
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

  // Precalcula cantidades por id para evitar colisiones si hubiera ids repetidos.
  list.forEach((row) => {
    const productId = row?.id != null ? String(row.id) : ''
    const stock = Math.max(0, Number(row?.stock) || 0)
    const requested = Math.max(0, Number(row?.cantidad) || 0)
    const orderQty = Math.min(requested, stock)
    if (!productId || orderQty <= 0) return

    const base = plannedQtyById.has(productId)
      ? plannedQtyById.get(productId)
      : Number(getExistingQty?.(productId) || 0)
    plannedQtyById.set(productId, base + orderQty)
  })

  await runWithConcurrency(list, concurrency, async (row) => {
    const productId = row?.id != null ? String(row.id) : ''
    const stock = Math.max(0, Number(row?.stock) || 0)
    const requested = Math.max(0, Number(row?.cantidad) || 0)
    const orderQty = Math.min(requested, stock)
    const requestBody = {
      id_producto: Number(productId),
      cantidad: plannedQtyById.get(productId) ?? orderQty,
      precio_unitario: toMoneyNumber(row?.precio),
    }

    if (!productId || !Number.isFinite(requestBody.id_producto) || orderQty <= 0) {
      failed.push({
        codigo: row?.codigo,
        reason: !productId ? 'Código sin producto en inventario' : 'Sin stock disponible',
        request: requestBody,
      })
      done += 1
      onProgress?.(done, list.length)
      return
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
        cantidad: orderQty,
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
