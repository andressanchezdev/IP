import { normalizeStockWarehouseKey } from './stockDetail.js'

/**
 * Bodega del cliente en sesión (id_bodega del login/perfil, 0 → 6).
 * Una sola fuente para: qué stock se muestra y qué `id_bodega` viaja en cada petición.
 */
let sessionWarehouseId = null

export function setSessionWarehouseId(value) {
  sessionWarehouseId = normalizeStockWarehouseKey(value)
}

export function getSessionWarehouseId() {
  return sessionWarehouseId
}

/** Copia del body con `id_bodega` (si se conoce la bodega del cliente). */
export function withWarehouse(body = {}) {
  const warehouseId = getSessionWarehouseId()
  return warehouseId ? { ...body, id_bodega: warehouseId } : body
}
