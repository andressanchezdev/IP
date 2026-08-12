import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getGeneral, PRODUCTS_PAGE_SIZE } from '@/features/catalog/api/generalApi'
import { mapApiProducts } from '@/features/catalog/mappers/mapProduct'
import { useStockWebSocket } from '@/features/catalog/ws/useStockWebSocket'
import { normalizeProduct } from '../helpers'

export function useCatalogSlice({
  tokenAccess,
  userId,
  applyCartFromApi,
  warehouseIdRef,
  setDrawerOpen,
  setCartCheckoutStep,
  resetOrderDrawer,
  cartHydratingRef,
}) {
  const [products, setProducts] = useState([])
  const [lastProductId, setLastProductId] = useState(null)
  const [hasMoreProducts, setHasMoreProducts] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [filters, setFilters] = useState({ brands: [], categories: [], models: [] })
  const [filterNuevos, setFilterNuevos] = useState(false)
  const [filterPromociones, setFilterPromociones] = useState(false)
  const [withStock, setWithStock] = useState(false)
  // Draft = edits inside Filtrar drawer; applied only via "Aplicar filtro".
  const [draftFilters, setDraftFilters] = useState({ brands: [], categories: [], models: [] })
  const [draftFilterNuevos, setDraftFilterNuevos] = useState(false)
  const [draftFilterPromociones, setDraftFilterPromociones] = useState(false)
  const [draftWithStock, setDraftWithStock] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [searchProducts, setSearchProducts] = useState(null)

  const productsRef = useRef(products)
  const productsLoadingRef = useRef(false)
  /** Mutual exclusion: 'search' | 'scroll' | null — search always wins. */
  const productFetchModeRef = useRef(null)
  const filtersRef = useRef(filters)
  const filterNuevosRef = useRef(filterNuevos)
  const filterPromocionesRef = useRef(filterPromociones)
  const withStockRef = useRef(withStock)
  const draftFiltersRef = useRef(draftFilters)
  const draftFilterNuevosRef = useRef(draftFilterNuevos)
  const draftFilterPromocionesRef = useRef(draftFilterPromociones)
  const draftWithStockRef = useRef(draftWithStock)

  productsRef.current = products
  filtersRef.current = filters
  filterNuevosRef.current = filterNuevos
  filterPromocionesRef.current = filterPromociones
  withStockRef.current = withStock
  draftFiltersRef.current = draftFilters
  draftFilterNuevosRef.current = draftFilterNuevos
  draftFilterPromocionesRef.current = draftFilterPromociones
  draftWithStockRef.current = draftWithStock

  // WS independiente del carrito API: solo actualiza stock de productos en catálogo.
  useStockWebSocket({
    enabled: Boolean(tokenAccess && userId),
    setProducts,
    preferredWarehouseIdRef: warehouseIdRef,
  })

  const mergeUniqueProducts = useCallback((currentProducts, incomingProducts) => {
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
  }, [])

  const isCatalogSearchActive = () => productFetchModeRef.current === 'search'

  const beginCatalogSearch = useCallback(() => {
    // Preempt scroll: search GET takes the lock immediately.
    productFetchModeRef.current = 'search'
  }, [])

  const endCatalogSearch = useCallback(() => {
    if (productFetchModeRef.current === 'search') {
      productFetchModeRef.current = null
    }
  }, [])

  const fetchProductsPage = useCallback(async ({
    token,
    lastId = null,
    replace = false,
    includeCart = false,
  }) => {
    const result = await getGeneral({
      token,
      lastId,
      limit: PRODUCTS_PAGE_SIZE,
    })

    const mappedProducts = mapApiProducts(result.productos).map(normalizeProduct)
    const cursor = result.nextCursor ?? result.lastId ?? null

    // If search took priority while scroll was in flight, discard catalog page apply.
    if (!replace && isCatalogSearchActive()) {
      return {
        mappedProducts,
        addedCount: 0,
        hasMore: false,
        lastId: cursor,
        skipped: true,
        reason: 'search_active',
      }
    }

    if (replace) {
      setProducts(mappedProducts)
      setLastProductId(cursor)
      setHasMoreProducts(result.hasMore)

      if (includeCart) {
        await applyCartFromApi({ token })
      }

      return {
        mappedProducts,
        addedCount: mappedProducts.length,
        hasMore: result.hasMore,
        lastId: cursor,
      }
    }

    const { merged, addedCount } = mergeUniqueProducts(productsRef.current, mappedProducts)
    setProducts(merged)
    setLastProductId(cursor)
    const hasMore = result.hasMore && addedCount > 0
    setHasMoreProducts(hasMore)

    return {
      mappedProducts,
      addedCount,
      hasMore,
      lastId: cursor,
    }
  }, [applyCartFromApi, mergeUniqueProducts])

  const loadMoreProducts = useCallback(async () => {
    const token = tokenAccess
    // Search GET has priority: never paginate catalog scroll while the bar has a query.
    if (isCatalogSearchActive()) {
      return { success: false, skipped: true, reason: 'search_active' }
    }
    // Applied filters: no scroll pagination (capped filtered set only).
    const applied = filtersRef.current
    if (
      (applied.brands?.length || 0) > 0
      || (applied.categories?.length || 0) > 0
      || (applied.models?.length || 0) > 0
      || filterNuevosRef.current
      || filterPromocionesRef.current
      || withStockRef.current
    ) {
      return { success: false, skipped: true, reason: 'filters_active' }
    }
    if (!token || !hasMoreProducts || productsLoadingRef.current || lastProductId == null) {
      return { success: false }
    }
    if (productFetchModeRef.current === 'scroll') {
      return { success: false, skipped: true, reason: 'scroll_in_flight' }
    }

    productFetchModeRef.current = 'scroll'
    productsLoadingRef.current = true
    setIsLoadingProducts(true)

    try {
      if (isCatalogSearchActive()) {
        return { success: false, skipped: true, reason: 'search_active' }
      }

      const result = await fetchProductsPage({
        token,
        lastId: lastProductId,
        replace: false,
      })

      if (result?.skipped) {
        return { success: false, skipped: true, reason: result.reason || 'search_active' }
      }

      return { success: true, ...result }
    } catch (error) {
      setHasMoreProducts(false)
      return {
        success: false,
        error: error?.message || 'No se pudieron cargar más productos',
      }
    } finally {
      if (productFetchModeRef.current === 'scroll') {
        productFetchModeRef.current = null
      }
      productsLoadingRef.current = false
      setIsLoadingProducts(false)
    }
  }, [tokenAccess, fetchProductsPage, hasMoreProducts, lastProductId])

  useEffect(() => {
    let cancelled = false

    async function hydrateFromApiSession() {
      if (!tokenAccess || !userId) {
        return
      }

      productsLoadingRef.current = true
      if (cartHydratingRef) {
        cartHydratingRef.current = true
      }
      setIsLoadingProducts(true)

      try {
        await fetchProductsPage({
          token: tokenAccess,
          lastId: null,
          replace: true,
          includeCart: true,
        })
      } catch (error) {
        if (!cancelled) {
          setHasMoreProducts(false)
          console.error('[hydrate] No se pudo cargar inventory/products + carts', error)
        }
      } finally {
        if (!cancelled) {
          productsLoadingRef.current = false
          if (cartHydratingRef) {
            cartHydratingRef.current = false
          }
          setIsLoadingProducts(false)
        }
      }
    }

    hydrateFromApiSession()

    return () => {
      cancelled = true
    }
  }, [tokenAccess, userId, fetchProductsPage, cartHydratingRef])

  const syncFilterDraftFromApplied = useCallback(() => {
    const current = filtersRef.current
    setDraftFilters({
      brands: [...(current.brands || [])],
      categories: [...(current.categories || [])],
      models: [...(current.models || [])],
    })
    setDraftFilterNuevos(filterNuevosRef.current)
    setDraftFilterPromociones(filterPromocionesRef.current)
    setDraftWithStock(withStockRef.current)
  }, [])

  const commitFilterDraft = useCallback(() => {
    const draft = draftFiltersRef.current
    setFilters({
      brands: [...(draft.brands || [])],
      categories: [...(draft.categories || [])],
      models: [...(draft.models || [])],
    })
    setFilterNuevos(draftFilterNuevosRef.current)
    setFilterPromociones(draftFilterPromocionesRef.current)
    setWithStock(draftWithStockRef.current)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({ brands: [], categories: [], models: [] })
    setFilterNuevos(false)
    setFilterPromociones(false)
    setWithStock(false)
    setDraftFilters({ brands: [], categories: [], models: [] })
    setDraftFilterNuevos(false)
    setDraftFilterPromociones(false)
    setDraftWithStock(false)
  }, [])

  const applyCatalogFiltersAndClose = useCallback(() => {
    commitFilterDraft()
    setDrawerOpen(false)
    setCartCheckoutStep(0)
    resetOrderDrawer()
  }, [commitFilterDraft, resetOrderDrawer, setCartCheckoutStep, setDrawerOpen])

  const resetCatalogForCacheClear = useCallback(() => {
    setProducts([])
    setLastProductId(null)
    setHasMoreProducts(false)
    setFilters({ brands: [], categories: [], models: [] })
    setSearchValue('')
    setSearchProducts(null)
  }, [])

  const value = useMemo(() => {
    const isCatalogFilterActive = Boolean(
      filters.brands.length
      || filters.categories.length
      || filters.models.length
      || filterNuevos
      || filterPromociones
      || withStock,
    )

    return {
      products,
      searchProducts,
      setSearchProducts,
      lastProductId,
      hasMoreProducts,
      isLoadingProducts,
      loadMoreProducts,
      beginCatalogSearch,
      endCatalogSearch,
      isCatalogSearchActive: searchProducts != null,
      isCatalogFilterActive,
      filters,
      setFilters,
      draftFilters,
      setDraftFilters,
      clearFilters,
      commitFilterDraft,
      applyCatalogFiltersAndClose,
      filterNuevos,
      setFilterNuevos,
      filterPromociones,
      setFilterPromociones,
      withStock,
      setWithStock,
      draftFilterNuevos,
      setDraftFilterNuevos,
      draftFilterPromociones,
      setDraftFilterPromociones,
      draftWithStock,
      setDraftWithStock,
      searchValue,
      setSearchValue,
    }
  }, [
    products,
    searchProducts,
    lastProductId,
    hasMoreProducts,
    isLoadingProducts,
    loadMoreProducts,
    beginCatalogSearch,
    endCatalogSearch,
    filters,
    draftFilters,
    clearFilters,
    commitFilterDraft,
    applyCatalogFiltersAndClose,
    filterNuevos,
    filterPromociones,
    withStock,
    draftFilterNuevos,
    draftFilterPromociones,
    draftWithStock,
    searchValue,
  ])

  return {
    products,
    setProducts,
    setSearchProducts,
    setLastProductId,
    setHasMoreProducts,
    setFilters,
    setFilterNuevos,
    setFilterPromociones,
    setWithStock,
    setSearchValue,
    syncFilterDraftFromApplied,
    resetCatalogForCacheClear,
    value,
  }
}
