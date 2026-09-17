import { useAuth, useCart, useCatalog, useOrders, useUi } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { AuthModal } from '@/features/auth'
import { FloatingCart } from '@/features/cart/components/FloatingCart/FloatingCart'
import { AppDrawer } from '@/widgets/AppDrawer/AppDrawer'
import { Header } from '@/widgets/AppShell/Header/Header'
import { Sidebar } from '@/widgets/AppShell/Sidebar/Sidebar'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStorePageActions } from './hooks/useStorePageActions'
import { useStorePageFilters } from './hooks/useStorePageFilters'
import { CatalogView } from './views/CatalogView'
import { HistoryView } from './views/HistoryView'
import { PendingOrdersView } from './views/PendingOrdersView'
import { ProductDetailModal } from '@/features/catalog/components/ProductDetailModal/ProductDetailModal'
import { StoreChatWidget } from '@/features/chatbot'
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
    applyFiltersDirect,
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
  const [historyStatusFilter, setHistoryStatusFilter] = useState('')

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
    statusOptions,
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
    historyStatusFilter,
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
    handleOpenCatalog,
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

  const [detailProductId, setDetailProductId] = useState(null)
  const pendingCatalogDriveRef = useRef(null)
  const catalogProducts = filteredProducts.length ? filteredProducts : products
  const detailProduct = useMemo(
    () => catalogProducts.find((item) => item.id === detailProductId) ?? null,
    [catalogProducts, detailProductId],
  )

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
    setHistoryStatusFilter('')
  }, [activeView, setSearchValue, clearCommittedProductSearch])

  const handleCatalogSearch = useCallback((query) => {
    const next = String(query || '').trim()
    if (!next) return
    if (activeView !== 'tienda') {
      pendingCatalogDriveRef.current = { type: 'search', query: next }
      navigateToView('tienda')
      return
    }
    clearFilters()
    setSearchValue(next)
    submitProductSearch(next)
  }, [activeView, navigateToView, clearFilters, setSearchValue, submitProductSearch])

  const handleCatalogFilter = useCallback((payload) => {
    const next = {
      brands: [...(payload?.brands || [])],
      categories: [...(payload?.categories || [])],
      models: [...(payload?.models || [])],
    }
    if (!next.brands.length && !next.categories.length && !next.models.length) {
      return
    }
    if (activeView !== 'tienda') {
      pendingCatalogDriveRef.current = { type: 'filter', payload: next }
      navigateToView('tienda')
      return
    }
    applyFiltersDirect(next)
    clearCommittedProductSearch()
  }, [activeView, navigateToView, applyFiltersDirect, clearCommittedProductSearch])

  useEffect(() => {
    const pending = pendingCatalogDriveRef.current
    if (activeView !== 'tienda' || !pending) {
      return
    }
    pendingCatalogDriveRef.current = null
    if (pending.type === 'search') {
      clearFilters()
      setSearchValue(pending.query)
      submitProductSearch(pending.query)
      return
    }
    applyFiltersDirect(pending.payload)
    clearCommittedProductSearch()
  }, [activeView, applyFiltersDirect, clearCommittedProductSearch, clearFilters, setSearchValue, submitProductSearch])

  useEffect(() => {
    if (activeView !== 'espera' && activeView !== 'historial') {
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
        onOpenDetail={setDetailProductId}
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
          statusOptions={statusOptions}
          statusFilter={historyStatusFilter}
          onStatusFilterChange={setHistoryStatusFilter}
        />

        <main className="landing__content">
          <div className="landing__view">
            {renderContent()}
          </div>
        </main>
      </div>

      <FloatingCart />
      <StoreChatWidget
        onLogin={() => openAuthModal()}
        onOpenPriceList={() => openDrawer('profile')}
        onOpenStore={() => {
          handleOpenCatalog()
          if (filterDrawerOpen) closeDrawer()
        }}
        onCatalogSearch={handleCatalogSearch}
        onCatalogFilter={handleCatalogFilter}
      />
      <AppDrawer />

      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuthModal}
        onLogin={handleLogin}
      />

      <ProductDetailModal
        product={detailProduct}
        isOpen={Boolean(detailProduct)}
        onClose={() => setDetailProductId(null)}
        isInCart={detailProduct ? cartProductIds.has(detailProduct.id) : false}
        onOrder={handleOrderProduct}
      />
    </div>
  )
}
