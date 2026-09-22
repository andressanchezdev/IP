/**
 * productsRef alimenta addToCart: catálogo paginado + últimos + búsqueda.
 * Los resultados de filtro se pasan como sourceProduct desde la card.
 */
export function syncCatalogProductsRef(productsRef, catalog) {
  const seen = new Set()
  const merged = []

  const append = (list) => {
    if (!Array.isArray(list)) {
      return
    }
    list.forEach((product) => {
      const id = String(product?.id ?? '')
      if (!id || seen.has(id)) {
        return
      }
      seen.add(id)
      merged.push(product)
    })
  }

  append(catalog.products)
  append(catalog.value?.latestProducts)
  append(catalog.value?.searchProducts)
  productsRef.current = merged
}
