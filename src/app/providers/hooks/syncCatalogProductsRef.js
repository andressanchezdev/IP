/**
 * Mantiene productsRef alineado con catálogo (+ latest) para el carrito.
 */
export function syncCatalogProductsRef(productsRef, catalog) {
  productsRef.current = catalog.products

  const latest = catalog.value?.latestProducts
  if (!Array.isArray(latest) || latest.length === 0) {
    return
  }

  const seen = new Set(catalog.products.map((product) => String(product.id)))
  productsRef.current = [
    ...catalog.products,
    ...latest.filter((product) => !seen.has(String(product.id))),
  ]
}
