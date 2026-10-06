import { getCatalogProductId } from '@/features/catalog/mappers/mapProduct'
import { getSessionWarehouseId } from '@/shared/lib/sessionWarehouse'
import { buildStockFields } from '@/shared/lib/stockDetail'

function overlayProduct(current, source) {
  const id = getCatalogProductId(source)
  if (!id || String(current.id) !== String(id)) {
    return null
  }

  const next = { ...current }
  if (source.precio != null && source.precio !== '') {
    const precio = Number(source.precio)
    if (Number.isFinite(precio) && precio >= 0) {
      next.precio = precio
      next.price = precio
    }
  }
  if (source.descripcion != null) next.description = String(source.descripcion).trim()
  if (source.categoria != null) next.category = String(source.categoria).trim()
  if (source.marca != null) next.brand = String(source.marca).trim()
  if (source.modelo != null) next.model = String(source.modelo).trim()
  if (source.codigo != null) next.reference = String(source.codigo).trim()
  if (source.searching != null) next.searching = String(source.searching).trim()
  if (source.compra != null && source.compra !== '') next.compra = Number(source.compra)
  if (source.iva != null && source.iva !== '') next.iva = Number(source.iva)
  if (source.exento != null && source.exento !== '') next.exento = Number(source.exento)

  const stockSource = source.stocking ?? source.stock
  if (stockSource != null && stockSource !== '') {
    // Misma regla que el resto: stock = cantidadAux de la bodega del cliente + detalle por ubicación.
    Object.assign(next, buildStockFields(stockSource, getSessionWarehouseId()), {
      stockUpdatedAt: Date.now(),
    })
  }

  return next
}

function replaceListedProducts(setProducts, sources) {
  const list = (Array.isArray(sources) ? sources : [sources])
    .filter((entry) => entry && typeof entry === 'object')
  if (list.length === 0 || typeof setProducts !== 'function') {
    return []
  }

  const updated = []
  setProducts((current) => {
    updated.length = 0
    if (!Array.isArray(current) || current.length === 0) {
      return current
    }

    let changed = false
    const next = current.map((product) => {
      const source = list.find((entry) => overlayProduct(product, entry))
      if (!source) {
        return product
      }
      const patched = overlayProduct(product, source)
      changed = true
      updated.push(patched.id)
      return patched
    })

    return changed ? next : current
  })

  return updated
}

/**
 * `nuevoControl` de ficha o promoción: solo pisa productos que ya están en pantalla.
 * `nuevoProducto` no se inserta en la página actual.
 */
export function applyCatalogNoticeFromWs(
  message,
  { setProducts, setSearchProducts, setLatestProducts } = {},
) {
  const control = String(message?.info?.control ?? '').trim()
  if (control === 'nuevoProducto') {
    return { action: 'omitido', control }
  }

  /** Catálogo + resultados de búsqueda (si no hay búsqueda su estado es null y se respeta). */
  const replaceEverywhere = (sources) => {
    const updated = replaceListedProducts(setProducts, sources)
    replaceListedProducts(setSearchProducts, sources)
    replaceListedProducts(setLatestProducts, sources)
    return updated
  }

  if (control === 'productoAct') {
    const updated = replaceEverywhere(message?.info?.producto)
    return {
      action: updated.length ? 'producto actualizado' : 'sin producto en pantalla',
      control,
      updatedIds: updated,
    }
  }

  if (control === 'nuevaPromocion') {
    const updated = replaceEverywhere(message?.info?.productos)
    return {
      action: updated.length ? 'promocion actualizada' : 'sin producto en pantalla',
      control,
      updatedIds: updated,
    }
  }

  return { action: 'ignorado', control }
}
