import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getGeneral, PRODUCTS_PAGE_SIZE } from '@/features/catalog/api/generalApi'
import { mapApiProducts } from '@/features/catalog/mappers/mapProduct'
import { mergeUniqueProducts } from '@/features/catalog/mappers/mergeUniqueProducts'
import { useStockWebSocket } from '@/features/catalog/ws/useStockWebSocket'
import { APP_EVENTS } from '../appEvents'
import { normalizeProduct } from '../helpers'
import { useCatalogFilters } from './useCatalogFilters'

export function useCatalogSlice({
  events,
  tokenAccess,
  userId,
  applyCartFromApi,
  warehouseIdRef,
  cartHydratingRef,
}) {
  const [products, setProducts] = useState([])
  const [lastProductId, setLastProductId] = useState(null)
  const [hasMoreProducts, setHasMoreProducts] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const filtersApi = useCatalogFilters()
  const {
    searchProducts,
    setSearchProducts,
    setSearchValue,
    commitFilterDraft,
    clearFilters,
    resetFiltersAndSearch,
    hasAppliedFilters,
  } = filtersApi

  const productsRef = useRef(products)
  const productsLoadingRef = useRef(false)
  /** Mutual exclusion: 'search' | 'scroll' | null — search always wins. */
  const productFetchModeRef = useRef(null)
  productsRef.current = products

  // WS independiente del carrito API: solo actualiza stock de productos en catálogo.
  useStockWebSocket({
    enabled: Boolean(tokenAccess && userId),
    setProducts,
    preferredWarehouseIdRef: warehouseIdRef,
  })

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
  }, [applyCartFromApi])

  const loadMoreProducts = useCallback(async () => {
    const token = tokenAccess
    // Search GET has priority: never paginate catalog scroll while the bar has a query.
    if (isCatalogSearchActive()) {
      return { success: false, skipped: true, reason: 'search_active' }
    }
    // Applied filters: no scroll pagination (capped filtered set only).
    if (hasAppliedFilters()) {
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
  }, [tokenAccess, fetchProductsPage, hasAppliedFilters, hasMoreProducts, lastProductId])

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

  const applyCatalogFiltersAndClose = useCallback(() => {
    commitFilterDraft()
    events.emit(APP_EVENTS.FILTERS_APPLIED)
  }, [commitFilterDraft, events])

  const resetCatalogProducts = useCallback(() => {
    setProducts([])
    setLastProductId(null)
    setHasMoreProducts(false)
  }, [])

  const resetCatalogForCacheClear = useCallback(() => {
    resetCatalogProducts()
    resetFiltersAndSearch()
  }, [resetCatalogProducts, resetFiltersAndSearch])

  const value = useMemo(() => {
    const isCatalogFilterActive = Boolean(
      filtersApi.filters.brands.length
      || filtersApi.filters.categories.length
      || filtersApi.filters.models.length
      || filtersApi.filterNuevos
      || filtersApi.filterPromociones
      || filtersApi.withStock,
    )

    return {
      ...filtersApi,
      products,
      lastProductId,
      hasMoreProducts,
      isLoadingProducts,
      loadMoreProducts,
      beginCatalogSearch,
      endCatalogSearch,
      isCatalogSearchActive: searchProducts != null,
      isCatalogFilterActive,
      clearFilters,
      applyCatalogFiltersAndClose,
    }
  }, [
    filtersApi,
    products,
    lastProductId,
    hasMoreProducts,
    isLoadingProducts,
    loadMoreProducts,
    beginCatalogSearch,
    endCatalogSearch,
    searchProducts,
    clearFilters,
    applyCatalogFiltersAndClose,
  ])

  return {
    products,
    setProducts,
    setSearchProducts,
    setSearchValue,
    resetCatalogProducts,
    resetCatalogForCacheClear,
    syncFilterDraftFromApplied: filtersApi.syncFilterDraftFromApplied,
    value,
  }
}
