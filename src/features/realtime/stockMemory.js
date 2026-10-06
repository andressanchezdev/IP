import { patchStockFields } from '../../shared/lib/stockDetail.js'

const MAX_ENTRIES = 600
/** @type {Map<string, { detail: object, at: number }>} */
const memory = new Map()

export function rememberStockSnapshot(productId, detail, at = Date.now()) {
  const id = String(productId ?? '').trim()
  if (!id || !detail) return
  memory.delete(id)
  memory.set(id, { detail, at })
  while (memory.size > MAX_ENTRIES) {
    memory.delete(memory.keys().next().value)
  }
}

/**
 * Una respuesta HTTP que salió antes del evento no debe pisar el stock que el socket ya aplicó.
 * No hace ninguna petición: solo reaplica fotos ya recibidas.
 */
export function overlayRealtimeStock(list, sinceMs, warehouseId = null) {
  if (!Array.isArray(list) || list.length === 0 || memory.size === 0) return list
  let changed = false
  const next = list.map((item) => {
    const entry = memory.get(String(item?.id ?? ''))
    if (!entry || entry.at < sinceMs) return item
    changed = true
    return patchStockFields(item, entry.detail, warehouseId)
  })
  return changed ? next : list
}

export function resetStockMemory() {
  memory.clear()
}
