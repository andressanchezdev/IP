import { useAuth, useCart, useCatalog, useOrders, useUi } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { AuthModal } from '@/features/auth'
import { FloatingCart } from '@/features/cart/components/FloatingCart/FloatingCart'
import { AppDrawer } from '@/widgets/AppDrawer/AppDrawer'
import { Header } from '@/widgets/AppShell/Header/Header'
import { Sidebar } from '@/widgets/AppShell/Sidebar/Sidebar'
import { useEffect, useState } from 'react'
import { useStorePageActions } from './hooks/useStorePageActions'
import { useStorePageFilters } from './hooks/useStorePageFilters'
import { CatalogView } from './views/CatalogView'
import { HistoryView } from './views/HistoryView'
import { PendingOrdersView } from './views/PendingOrdersView'
import './StorePage.css'

export function StorePage() {
  const sidebarActiveItemByView = {
    tienda: 'tienda',
    espera: 'Historial',
    historial: 'Cartera',
  }

  const {
    isAuthenticated,
    tokenAccess,
    authModalOpen,
    openAuthModal,
    closeAuthModal,
    login,
    logout,
    pendingCheckout,
    pendingEsperaView,
  } = useAuth()
  const { cartItems, addToCart } = useCart()
  const {
    pendingOrders,
    historyOrders,
    openOrderDrawer,
    isLoadingHistory,
    historyLoadError,
    loadHistoryFromApi,
  } = useOrders()
  const {
    products,
    searchProducts,
    latestProducts,
    filters,
    filterModes,
    clearFilters,
    filterNuevos,
    setFilterNuevos,
    filterPromociones,
    setFilterPromociones,
    withStock,
    setWithStock,
    searchValue,
    setSearchValue,
    setSearchProducts,
    setLatestProducts,
    beginCatalogSearch,
    endCatalogSearch,
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
    submitProductSearch,
    clearCommittedProductSearch,
    isLoadingLatest,
  } = useStorePageFilters({
    activeView,
    products,
    searchProducts,
    latestProducts,
    pendingOrders,
    historyOrders,
    cartItems,
    filters,
    filterModes,
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
  })

  const {
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
  } = useStorePageActions({
    products: filteredProducts.length ? filteredProducts : products,
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
    clearCommittedProductSearch()
    setHistoryPaymentFilter('')
  }, [activeView, setSearchValue, clearCommittedProductSearch])

  useEffect(() => {
    if (activeView !== 'espera') {
      return undefined
    }
    if (!isAuthenticated || !tokenAccess) {
      return undefined
    }
    const controller = new AbortController()
    loadHistoryFromApi({
      token: tokenAccess,
      signal: controller.signal,
    })
    return () => controller.abort()
  }, [activeView, isAuthenticated, tokenAccess, loadHistoryFromApi])

  const renderContent = () => {
    if (activeView === 'espera') {
      return (
        <PendingOrdersView
          pendingOrders={pendingOrders}
          filteredOrders={filteredPendingOrders}
          onOpenOrder={handleOpenOrder}
          isLoading={isLoadingHistory}
          errorMessage={historyLoadError}
        />
      )
    }

    if (activeView === 'historial') {
      return (
        <HistoryView
          historyOrders={historyOrders}
          filteredOrders={filteredHistoryOrders}
          isLoading={isLoadingHistory}
          errorMessage={historyLoadError}
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
        isLoadingLatest={isLoadingLatest}
      />
    )
  }

  return (
    <div className={`landing ${drawerOpen ? 'landing--drawer-open' : ''}`}>
      <Sidebar
        activeItem={sidebarActiveItemByView[activeView] ?? 'tienda'}
        isAuthenticated={isAuthenticated}
        onNavigate={handleNavigate}
        onProfileClick={handleProfileClick}
        onLogin={() => openAuthModal()}
        onLogout={handleLogout}
      />

      <div className="landing__main">
        <Header
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onSearchSubmit={handleSearchSubmit}
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
        onClose={closeAuthModal}
        onLogin={handleLogin}
      />
    </div>
  )
}
