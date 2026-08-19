import { deleteCartItem, deleteMassiveCartItems, postCartItem } from './cartApi'

/**
 * Wrappers que nunca lanzan: devuelven { success, error?, needsAuth? }
 * para que los slices manejen el resultado sin try/catch propio.
 * Carrito solo por API; no modifica stock (eso lo hace el WS).
 */
export async function persistCartItemSafe({ token, productId, cantidad, precioUnitario }) {
  if (!token) {
    return { success: false, error: 'Sesión requerida', needsAuth: true }
  }

  try {
    const result = await postCartItem({
      token,
      idProducto: productId,
      cantidad,
      precioUnitario,
    })
    return { success: true, ...result }
  } catch (error) {
    console.error('[cart] No se pudo guardar POST /api/v1/inventory/carts', error)
    return {
      success: false,
      error: error?.message || 'No se pudo guardar el carrito',
    }
  }
}

export async function removeCartItemSafe({ token, idCarrito }) {
  if (!token) {
    return { success: false, error: 'Sesión requerida', needsAuth: true }
  }

  if (idCarrito == null || idCarrito === '') {
    return { success: false, error: 'id_carrito no disponible' }
  }

  try {
    const result = await deleteCartItem({ token, idCarrito })
    return { success: true, ...result }
  } catch (error) {
    console.error('[cart] No se pudo eliminar DELETE /api/v1/inventory/carts', error)
    return {
      success: false,
      error: error?.message || 'No se pudo eliminar del carrito',
    }
  }
}

/** Una sola petición DELETE /carts/massive { type: 'all' }. El stock se refleja por WS. */
export async function clearCartMassiveSafe({ token } = {}) {
  if (!token) {
    return { success: false, error: 'Sesión requerida', needsAuth: true }
  }

  try {
    const result = await deleteMassiveCartItems({ token })
    return { success: true, ...result }
  } catch (error) {
    console.error('[cart] No se pudo limpiar DELETE /api/v1/inventory/carts/massive', error)
    return {
      success: false,
      error: error?.message || 'No se pudo limpiar el carrito',
    }
  }
}
