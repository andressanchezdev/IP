import { useAuth, useCart, useCatalog, useOrders, useUi } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { AuthModal } from '@/features/auth'
import { FloatingCart } from '@/features/cart/components/FloatingCart/FloatingCart'
import { confirmAction } from '@/shared/lib/confirmAction'
import { AppDrawer } from '@/widgets/AppDrawer/AppDrawer'
import { Header } from '@/widgets/AppShell/Header/Header'
import { Sidebar } from '@/widgets/AppShell/Sidebar/Sidebar'
import { useCallback, useEffect, useState, startTransition } from 'react'
import { useStorePageFilters } from './hooks/useStorePageFilters'
import { CatalogView } from './views/CatalogView'
import { HistoryView } from './views/HistoryView'
import { PendingOrdersView } from './views/PendingOrdersView'
import './StorePage.css'

export function StorePage() {
  const {
    isAuthenticated,
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    switchAuthModalMode,
    login,
    register,
    logout,
    pendingCheckout,
    pendingEsperaView,
  } = useAuth()
  const { cartItems, addToCart } = useCart()
  const { pendingOrders, historyOrders, openOrderDrawer } = useOrders()
  const {
    products,
    filters,
    clearFilters,
    filterNuevos,
    setFilterNuevos,
    filterPromociones,
    setFilterPromociones,
    withStock,
    setWithStock,
    searchValue,
    setSearchValue,
  } = useCatalog()
  const {
    activeView,
    navigateToView,
    drawerOpen,
    drawerType,
    openDrawer,
    closeDrawer,
  } = useUi()
  const { showToast } = useToast()
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState('')

  const {
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
  } = useStorePageFilters({
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
  })

  useEffect(() => {
    if (!isStoreView) {
      setFilterNuevos(false)
      setFilterPromociones(false)
      setWithStock(false)
      if (filterDrawerOpen) {
        closeDrawer()
      }
    }
  }, [
    isStoreView,
    filterDrawerOpen,
    closeDrawer,
    setFilterNuevos,
    setFilterPromociones,
    setWithStock,
  ])

  useEffect(() => {
    if (drawerOpen && drawerType === 'order' && activeView !== 'espera') {
      closeDrawer()
    }
  }, [activeView, drawerOpen, drawerType, closeDrawer])

  useEffect(() => {
    setSearchValue('')
    setHistoryPaymentFilter('')
  }, [activeView, setSearchValue])

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

  const handleClearSearch = () => {
    if (!isStoreView) {
      setSearchValue('')
      return
    }

    clearFilters()
    if (hasActiveFilters) {
      showToast('Filtros limpiados', 'success')
    }
  }

  const handleProfileClick = () => {
    if (!isAuthenticated) {
      openAuthModal('login')
      return
    }
    openDrawer('profile')
  }

  const handleLogin = async (credentials) => {
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
  }

  const handleRegister = (formData) => {
    const result = register(formData)
    if (!result.success) {
      showToast(result.error, 'error')
      return
    }
    showToast('Cuenta creada e iniciada correctamente', 'success')
  }

  const handleLogout = async () => {
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
  }

  const renderContent = () => {
    if (activeView === 'espera') {
      return (
        <PendingOrdersView
          pendingOrders={pendingOrders}
          filteredOrders={filteredPendingOrders}
          onOpenOrder={handleOpenOrder}
        />
      )
    }

    if (activeView === 'historial') {
      return (
        <HistoryView
          historyOrders={historyOrders}
          filteredOrders={filteredHistoryOrders}
        />
      )
    }

    if (activeView !== 'tienda') {
      return null
    }

    return (
      <CatalogView
        products={filteredProducts}
        cartProductIds={cartProductIds}
        onOrder={handleOrderProduct}
      />
    )
  }

  return (
    <div className={`landing ${drawerOpen ? 'landing--drawer-open' : ''}`}>
      <Sidebar
        activeItem={activeView}
        isAuthenticated={isAuthenticated}
        onNavigate={handleNavigate}
        onProfileClick={handleProfileClick}
        onLogin={() => openAuthModal('login')}
        onLogout={handleLogout}
      />

      <div className="landing__main">
        <Header
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder={headerSearch.placeholder}
          searchAriaLabel={headerSearch.ariaLabel}
          onClearSearch={handleClearSearch}
          canClearSearch={isStoreView ? hasSearchValue || hasActiveFilters : hasSearchValue}
          onFilter={() => {
            openDrawer('filter')
          }}
          onNew={() => {
            if (filterDrawerOpen) {
              closeDrawer()
            }
            handleToggleNuevos()
          }}
          onPromo={() => {
            if (filterDrawerOpen) {
              closeDrawer()
            }
            handleTogglePromociones()
          }}
          onCart={() => openDrawer('cart')}
          cartCount={cartItems.length}
          cartActive={drawerOpen && drawerType === 'cart'}
          filterActive={filterDrawerOpen}
          filterNuevosActive={filterNuevos}
          filterPromocionesActive={filterPromociones}
          showStoreFilters={isStoreView}
          showHistoryFilters={activeView === 'historial'}
          paymentMethods={paymentMethods}
          paymentFilter={historyPaymentFilter}
          onPaymentFilterChange={setHistoryPaymentFilter}
        />

        <main className="landing__content">
          <div className="landing__view">
            {renderContent()}
          </div>
        </main>
      </div>

      <FloatingCart />
      <AppDrawer />

      <AuthModal
        isOpen={authModalOpen}
        mode={authModalMode}
        onClose={closeAuthModal}
        onSwitchMode={() => switchAuthModalMode(authModalMode === 'login' ? 'register' : 'login')}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    </div>
  )
}
