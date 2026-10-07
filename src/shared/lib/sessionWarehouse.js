import { normalizeStockWarehouseKey } from './stockDetail.js'

/**
 * Bodega del cliente en sesión (id_bodega del login/perfil, 0 → 6).
 * Se usa para mostrar el stock de la bodega seleccionada.
 */
let sessionWarehouseId = null

export function setSessionWarehouseId(value) {
  sessionWarehouseId = normalizeStockWarehouseKey(value)
}

export function getSessionWarehouseId() {
  return sessionWarehouseId
}
