import { useCallback, useRef, startTransition } from 'react'
import { confirmAction } from '@/shared/lib/confirmAction'

const VIEW_ALIAS = Object.freeze({
  Historial: 'espera',
  Cartera: 'historial',
})

const ORDER_COOLDOWN_MS = 300

/**
 * Handlers de la página de tienda (navegación, búsqueda, carrito, sesión).
 * Mantiene StorePage como componente de composición.
 */
export function useStorePageActions({
  products,
  addToCart,
  isOrderingProduct,
  showToast,
  navigateToView,
  setFilterNuevos,
  setFilterPromociones,
  isStoreView,
  submitProductSearch,
  clearCommittedProductSearch,
  setSearchValue,
  clearFilters,
  clearBotFiltersOnSearch,
  hasActiveFilters,
  isAuthenticated,
  openAuthModal,
  openDrawer,
  openOrderDrawer,
  login,
  logout,
  pendingCheckout,
  pendingEsperaView,
}) {
  const orderCooldownRef = useRef(new Map())

  const handleOpenOrder = useCallback((orderId) => {
    openOrderDrawer(orderId)
  }, [openOrderDrawer])

  const handleOrderProduct = useCallback(async (productId, quantity) => {
    const key = String(productId)
    if (isOrderingProduct?.(productId)) {
      return
    }

    const lastAt = orderCooldownRef.current.get(key) || 0
    if (Date.now() - lastAt < ORDER_COOLDOWN_MS) {
      return
    }

    const product = products.find((item) => String(item.id) === String(productId))
    let optimisticToast = false
    const result = await addToCart(productId, quantity, product, {
      onOptimistic: () => {
        optimisticToast = true
        orderCooldownRef.current.set(key, Date.now())
        showToast(`${product?.description ?? 'Producto'} agregado al carrito`, 'success')
      },
    })

    if (result?.duplicate) {
      return
    }

    if (!result?.success) {
      showToast(result?.error || 'No se pudo agregar al carrito', 'error')
      return
    }

    if (!optimisticToast) {
      orderCooldownRef.current.set(key, Date.now())
      showToast(`${product?.description ?? 'Producto'} agregado al carrito`, 'success')
    }
  }, [addToCart, isOrderingProduct, products, showToast])

  const handleNavigate = useCallback((view) => {
    const resolvedView = VIEW_ALIAS[view] ?? view
    startTransition(() => {
      navigateToView(resolvedView)
    })
  }, [navigateToView])

  const handleToggleNuevos = useCallback(() => {
    startTransition(() => {
      setFilterNuevos((current) => !current)
    })
  }, [setFilterNuevos])

  const handleTogglePromociones = useCallback(() => {
    startTransition(() => {
      setFilterPromociones((current) => !current)
    })
  }, [setFilterPromociones])

  const handleSearchSubmit = useCallback(() => {
    if (!isStoreView) {
      return
    }
    // Filtro del bot: se limpia al buscar en la barra. Filtro manual del usuario: se conserva.
    clearBotFiltersOnSearch?.()
    submitProductSearch()
  }, [isStoreView, clearBotFiltersOnSearch, submitProductSearch])

  const handleClearSearch = useCallback(() => {
    if (!isStoreView) {
      setSearchValue('')
      return
    }

    setSearchValue('')
    clearCommittedProductSearch()
    clearFilters()
    if (hasActiveFilters) {
      showToast('Filtros limpiados', 'success')
    }
  }, [
    isStoreView,
    setSearchValue,
    clearCommittedProductSearch,
    clearFilters,
    hasActiveFilters,
    showToast,
  ])

  const handleOpenCatalog = useCallback(() => {
    if (isStoreView) {
      showToast('Ya se encuentra viendo el catálogo', 'success')
    }
    setSearchValue('')
    clearCommittedProductSearch()
    clearFilters()
    navigateToView('tienda')
  }, [isStoreView, showToast, setSearchValue, clearCommittedProductSearch, clearFilters, navigateToView])

  const handleProfileClick = useCallback(() => {
    if (!isAuthenticated) {
      openAuthModal()
      return
    }
    openDrawer('profile')
  }, [isAuthenticated, openAuthModal, openDrawer])

  const handleLogin = useCallback(async (credentials) => {
    const result = await login(credentials)
    if (!result.success) {
      showToast(result.error, 'error')
      return
    }
    showToast(
      pendingCheckout
        ? 'Sesión iniciada. Continúe con el pago.'
        : pendingEsperaView
          ? 'Sesión iniciada. Mostrando sus pedidos en espera.'
          : 'Sesión iniciada correctamente',
      'success',
    )
  }, [login, pendingCheckout, pendingEsperaView, showToast])

  const handleLogout = useCallback(async () => {
    const confirmed = await confirmAction({
      title: '¿Cerrar sesión?',
      text: 'Se cerrará tu sesión actual en Importadora Premium.',
      confirmText: 'Cerrar sesión',
      icon: 'question',
    })

    if (!confirmed) {
      return
    }

    await logout()
    showToast('Sesión cerrada correctamente', 'success')
  }, [logout, showToast])

  return {
    handleOpenOrder,
    handleOrderProduct,
    handleNavigate,
    handleToggleNuevos,
    handleTogglePromociones,
    handleSearchSubmit,
    handleClearSearch,
    handleOpenCatalog,
    handleProfileClick,
    handleLogin,
    handleLogout,
  }
}
