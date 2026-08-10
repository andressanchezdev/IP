import { useMemo } from 'react'
import { matchesOrderIdSearch } from '@/features/orders/utils/orderSearch'
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue'

export const SEARCH_DEBOUNCE_MS = 350

export function useStorePageFilters({
  activeView,
  products,
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
}) {
  // Espera a que el usuario deje de escribir antes de filtrar (evita trabajo/peticiones por tecla).
  const debouncedSearchValue = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS)
  const isStoreView = activeView === 'tienda'
  const headerSearch = {
    tienda: { placeholder: 'Buscar productos', ariaLabel: 'Buscar productos' },
    espera: { placeholder: 'Buscar ', ariaLabel: 'Buscar pedido por número' },
    historial: { placeholder: 'Buscar', ariaLabel: 'Buscar pedido por número' },
  }[activeView] ?? { placeholder: 'Buscar productos', ariaLabel: 'Buscar productos' }
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

  const filteredProducts = useMemo(() => {
    const query = debouncedSearchValue.trim().toLowerCase()
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        [product.description, product.model, product.brand, product.reference, product.category, product.searching]
          .join(' ')
          .toLowerCase()
          .includes(query)

      const matchesBrand = filters.brands.length === 0 || filters.brands.includes(product.brand)
      const matchesCategory =
        filters.categories.length === 0 || filters.categories.includes(product.category)
      const matchesModel = filters.models.length === 0 || filters.models.includes(product.model)

      const matchesQuickOptions =
        (!filterNuevos && !filterPromociones) ||
        (filterNuevos && product.stock >= 5) ||
        (filterPromociones && product.price <= 17500)

      const matchesWithStock = !withStock || product.stock > 0

      return (
        matchesSearch &&
        matchesBrand &&
        matchesCategory &&
        matchesModel &&
        matchesQuickOptions &&
        matchesWithStock
      )
    })
  }, [products, filters, debouncedSearchValue, filterNuevos, filterPromociones, withStock])

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
  }
}
