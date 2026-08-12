import { postBulkOrderToCart } from './bulkCartPost'
import { selectRowsExcludedFromCart, selectRowsForCart } from './bulkOrderApi'

/**
 * Continuar / Continuar sin novedad:
 * selecciona filas según la decisión, postea al carrito y consolida
 * las exclusiones (agotados/novedad + fallos de POST) para "Informacion".
 */
export async function submitBulkOrderSelection({
  results,
  onlyOk,
  token,
  getExistingQty,
  onStart,
  onProgress,
}) {
  const rows = Array.isArray(results) ? results : []
  const selected = selectRowsForCart(rows, { onlyOk })
  const excluded = selectRowsExcludedFromCart(rows, { onlyOk })

  if (selected.length === 0) {
    return { emptySelection: true, selected, excluded, posted: [], failed: [] }
  }

  onStart?.(selected.length)

  const { posted, failed } = await postBulkOrderToCart(selected, {
    token,
    getExistingQty,
    onProgress,
  })

  const failedAsExcluded = failed.map((entry) => ({
    codigo: entry.codigo,
    estado: entry.reason || 'error',
    cantidad: 0,
    stock: 0,
  }))

  return {
    emptySelection: false,
    selected,
    excluded: [...excluded, ...failedAsExcluded],
    posted,
    failed,
  }
}
