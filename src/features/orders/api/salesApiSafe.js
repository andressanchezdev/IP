import { postManagementSales } from './salesApi'

/**
 * Wrapper que no lanza: { success, error?, needsAuth?, sale?, request?, raw? }
 */
export async function postManagementSalesSafe({
  token,
  metodoPago,
  direccion,
  total,
  fecha,
  signal,
} = {}) {
  if (!token) {
    return { success: false, error: 'Sesión requerida', needsAuth: true }
  }

  try {
    const result = await postManagementSales({
      token,
      metodoPago,
      direccion,
      total,
      fecha,
      signal,
    })
    return { success: true, ...result }
  } catch (error) {
    console.error('[sales] No se pudo crear POST /api/v1/managment/sales', error)
    return {
      success: false,
      error: error?.message || 'No se pudo crear el pedido',
      needsAuth: error?.status === 401,
    }
  }
}
