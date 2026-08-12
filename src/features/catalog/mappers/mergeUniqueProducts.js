/**
 * Une una página entrante al listado actual descartando ids repetidos.
 * Devuelve también cuántos productos nuevos se agregaron (corta el scroll
 * infinito cuando la API repite página).
 */
export function mergeUniqueProducts(currentProducts, incomingProducts) {
  if (!incomingProducts.length) {
    return { merged: currentProducts, addedCount: 0 }
  }

  const seen = new Set(currentProducts.map((product) => String(product.id)))
  const uniqueIncoming = incomingProducts.filter((product) => {
    const id = String(product.id)
    if (seen.has(id)) {
      return false
    }
    seen.add(id)
    return true
  })

  return {
    merged: [...currentProducts, ...uniqueIncoming],
    addedCount: uniqueIncoming.length,
  }
}
