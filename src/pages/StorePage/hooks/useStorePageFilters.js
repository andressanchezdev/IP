import { useCallback, useEffect, useMemo, useState } from 'react'
import { PRODUCTS_PAGE_SIZE, getLatestInventoryProducts, searchInventoryProducts } from '@/features/catalog/api/generalApi'
import { mapApiProducts } from '@/features/catalog/mappers/mapProduct'
import { matchesOrderIdSearch } from '@/features/orders/utils/orderSearch'
import { getApiAuthToken } from '@/shared/api'
import { getBrandLogoUrl } from '@/shared/lib/brandLogos'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'

const SEARCH_DEBOUNCE_MS = 350
/** Cap filtered landing results to avoid scroll/request storms after applying filters. */
const FILTER_RESULT_LIMIT = PRODUCTS_PAGE_SIZE

function normalizeProduct(product) {
  return {
    ...product,
    brandLogo: product.brandLogo || product.brandLogoUrl || getBrandLogoUrl(product.brand),
    imageUrl: product.imageUrl || '',
  }
}

/**
 * Filtros locales sobre resultados (catálogo o GET search).
 * Campos UI ← JSON API: brand←marca, category←categoria, model←modelo.
 */
function applyCatalogFilters(list, {
  filters,
  filterPromociones,
  withStock,
}) {
  return list.filter((product) => {
    const matchesBrand = filters.brands.length === 0 || filters.brands.includes(product.brand)
    const matchesCategory =
      filters.categories.length === 0 || filters.categories.includes(product.category)
    const matchesModel = filters.models.length === 0 || filters.models.includes(product.model)

    const matchesQuickOptions =
      !filterPromociones || (filterPromociones && product.price <= 17500)

    const matchesWithStock = !withStock || product.stock > 0

    return (
      matchesBrand &&
      matchesCategory &&
      matchesModel &&
      matchesQuickOptions &&
      matchesWithStock
    )
  })
}

function isAbortError(error) {
  return (
    error?.name === 'AbortError'
    || error?.code === 20
    || /aborted|abort/i.test(String(error?.message || ''))
  )
}

export function useStorePageFilters({
  activeView,
  products,
  searchProducts,
  latestProducts,
  pendingOrders,
  historyOrders,
  cartItems,
  filters,
  filterNuevos,
  filterPromociones,
  withStock,
  searchValue,
  historyPaymentFilter,
  drawerOpen,
  drawerType,
  setSearchProducts,
  setLatestProducts,
  beginCatalogSearch,
  endCatalogSearch,
}) {
  const debouncedSearchValue = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS)
  const isStoreView = activeView === 'tienda'

  // Product search GET only runs after Enter (committed query).
  // Source of truth for results: context `searchProducts` (no local duplicate).
  const [committedProductSearch, setCommittedProductSearch] = useState('')
  const [productSearchNonce, setProductSearchNonce] = useState(0)
  const [isLoadingLatest, setIsLoadingLatest] = useState(false)

  const headerSearch = {
    tienda: { placeholder: 'Buscar productos ', ariaLabel: 'Buscar productos' },
    espera: { placeholder: 'Buscar ', ariaLabel: 'Buscar pedido por número' },
    historial: { placeholder: 'Buscar', ariaLabel: 'Buscar pedido por número' },
  }[activeView] ?? { placeholder: 'Buscar productos (Enter)', ariaLabel: 'Buscar productos' }

  const hasActiveFilters = Boolean(
    filters.brands.length ||
      filters.categories.length ||
      filters.models.length ||
      filterNuevos ||
      filterPromociones ||
      withStock,
  )
  const hasSearchValue = Boolean(searchValue.trim())
  const filterDrawerOpen = drawerOpen && drawerType === 'filter'
  const hasCommittedProductSearch = Boolean(committedProductSearch)

  const submitProductSearch = useCallback(() => {
    if (!isStoreView) {
      return
    }
    const next = String(searchValue || '').trim()
    setCommittedProductSearch(next)
    setProductSearchNonce((current) => current + 1)
  }, [isStoreView, searchValue])

  const clearCommittedProductSearch = useCallback(() => {
    setCommittedProductSearch('')
    setProductSearchNonce(0)
    setSearchProducts?.(null)
    endCatalogSearch?.()
  }, [endCatalogSearch, setSearchProducts])

  useEffect(() => {
    if (!isStoreView) {
      clearCommittedProductSearch()
    }
  }, [isStoreView, clearCommittedProductSearch])

  useEffect(() => {
    if (!isStoreView) {
      return undefined
    }

    if (!committedProductSearch) {
      endCatalogSearch?.()
      setSearchProducts?.(null)
      return undefined
    }

    const token = getApiAuthToken()
    if (!token) {
      beginCatalogSearch?.()
      setSearchProducts?.([])
      return () => {
        endCatalogSearch?.()
      }
    }

    const controller = new AbortController()
    let cancelled = false
    const search = committedProductSearch

    beginCatalogSearch?.()

    searchInventoryProducts({
      token,
      search,
      signal: controller.signal,
    })
      .then((result) => {
        if (cancelled) return
        const mapped = mapApiProducts(result.productos).map(normalizeProduct)
        setSearchProducts?.(mapped)
      })
      .catch((error) => {
        if (cancelled || isAbortError(error) || controller.signal.aborted) {
          return
        }
        console.error(
          `[search] Falló GET /api/v1/inventory/products/search?search=${encodeURIComponent(search)}`,
          error?.status || '',
          error,
        )
        setSearchProducts?.([])
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [
    isStoreView,
    committedProductSearch,
    productSearchNonce,
    setSearchProducts,
    beginCatalogSearch,
    endCatalogSearch,
  ])

  useEffect(() => {
    if (!isStoreView || !filterNuevos) {
      setIsLoadingLatest(false)
      setLatestProducts?.(null)
      return undefined
    }

    const token = getApiAuthToken()
    if (!token) {
      setLatestProducts?.([])
      setIsLoadingLatest(false)
      return undefined
    }

    const controller = new AbortController()
    let cancelled = false
    setIsLoadingLatest(true)

    getLatestInventoryProducts({
      token,
      signal: controller.signal,
    })
      .then((result) => {
        if (cancelled) return
        const mapped = mapApiProducts(result.productos).map(normalizeProduct)
        setLatestProducts?.(mapped)
      })
      .catch((error) => {
        if (cancelled || isAbortError(error) || controller.signal.aborted) {
          return
        }
        console.error('[nuevos] Falló GET /api/v1/inventory/products/latest', error?.status || '', error)
        setLatestProducts?.([])
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingLatest(false)
        }
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isStoreView, filterNuevos, setLatestProducts])

  const filteredProducts = useMemo(() => {
    if (filterNuevos && isStoreView) {
      return latestProducts ?? []
    }

    const source = (hasCommittedProductSearch && isStoreView)
      ? (searchProducts ?? [])
      : products

    if (filterDrawerOpen) {
      return source
    }

    const filtered = applyCatalogFilters(source, {
      filters,
      filterPromociones,
      withStock,
    })

    // Cap only search/filter results. Catalog scroll must show every loaded page.
    if (hasCommittedProductSearch || hasActiveFilters) {
      return filtered.slice(0, FILTER_RESULT_LIMIT)
    }

    return filtered
  }, [
    hasCommittedProductSearch,
    isStoreView,
    searchProducts,
    products,
    filterDrawerOpen,
    filters,
    filterNuevos,
    latestProducts,
    filterPromociones,
    withStock,
    hasActiveFilters,
  ])

  const filteredPendingOrders = useMemo(() => {
    if (activeView !== 'espera') {
      return pendingOrders
    }

    return pendingOrders.filter((order) => matchesOrderIdSearch(order, debouncedSearchValue))
  }, [activeView, pendingOrders, debouncedSearchValue])

  const paymentMethods = useMemo(
    () => [...new Set(historyOrders.map((order) => order.paymentMethod).filter(Boolean))],
    [historyOrders],
  )

  const filteredHistoryOrders = useMemo(() => {
    if (activeView !== 'historial') {
      return historyOrders
    }

    return historyOrders.filter((order) => {
      const matchesPayment = !historyPaymentFilter || order.paymentMethod === historyPaymentFilter
      return matchesOrderIdSearch(order, debouncedSearchValue) && matchesPayment
    })
  }, [activeView, historyOrders, debouncedSearchValue, historyPaymentFilter])

  const cartProductIds = useMemo(
    () => new Set(cartItems.map((item) => item.id)),
    [cartItems],
  )

  return {
    isStoreView,
    headerSearch,
    hasActiveFilters,
    hasSearchValue,
    filterDrawerOpen,
    filteredProducts,
    filteredPendingOrders,
    filteredHistoryOrders,
    paymentMethods,
    cartProductIds,
    submitProductSearch,
    clearCommittedProductSearch,
    isLoadingLatest,
  }
}
