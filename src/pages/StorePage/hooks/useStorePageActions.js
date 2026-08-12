import { useCallback, startTransition } from 'react'
import { confirmAction } from '@/shared/lib/confirmAction'

/**
 * Handlers de la página de tienda (navegación, búsqueda, carrito, sesión).
 * Mantiene StorePage como componente de composición.
 */
export function useStorePageActions({
  products,
  addToCart,
  showToast,
  navigateToView,
  setFilterNuevos,
  setFilterPromociones,
  isStoreView,
  submitProductSearch,
  clearCommittedProductSearch,
  setSearchValue,
  clearFilters,
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
  const handleOpenOrder = useCallback((orderId) => {
    openOrderDrawer(orderId)
  }, [openOrderDrawer])

  const handleOrderProduct = useCallback(async (productId, quantity) => {
    const product = products.find((item) => item.id === productId)
    const result = await addToCart(productId, quantity)

    if (!result?.success) {
      showToast(result?.error || 'No se pudo agregar al carrito', 'error')
      return
    }

    showToast(`${product?.description ?? 'Producto'} agregado al carrito`, 'success')
  }, [addToCart, products, showToast])

  const handleNavigate = useCallback((view) => {
    startTransition(() => {
      navigateToView(view)
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
    submitProductSearch()
  }, [isStoreView, submitProductSearch])

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

    logout()
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
    handleProfileClick,
    handleLogin,
    handleLogout,
  }
}
