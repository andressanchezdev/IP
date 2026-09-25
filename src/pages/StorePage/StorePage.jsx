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
import { StoreChatWidget, takePendingChatBulk } from '@/features/chatbot'
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
  const { cartItems, addToCart, refreshCartFromApi, orderingProductIds, isOrderingProduct } = useCart()
  const {
    pendingOrders,
    historyOrders,
    openOrderDrawer,
    openOrderPayments,
    openOrderAbonos,
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
    clearBotFiltersOnSearch,
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
  const [profileLaunchView, setProfileLaunchView] = useState(null)
  const [viewCue, setViewCue] = useState({ search: 0, catalog: 0 })
  const catalogViewRef = useRef(null)

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
    if (drawerOpen && drawerType === 'order' && activeView !== 'espera' && activeView !== 'historial') {
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
    setViewCue((current) => ({ ...current, search: Date.now() }))
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

  const handleOpenPriceList = useCallback(() => {
    setProfileLaunchView('price-list')
    openDrawer('profile')
  }, [openDrawer])

  const handleOpenBulkUpload = useCallback(() => {
    setProfileLaunchView('bulk-upload')
    openDrawer('profile')
  }, [openDrawer])

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const { downloadOfficialExcelTemplate } = await import('@/features/profile/lib/productExcel')
      await downloadOfficialExcelTemplate()
      showToast('Plantilla descargada', 'success')
    } catch (error) {
      showToast(error?.message || 'No se pudo descargar la plantilla', 'error')
    }
  }, [showToast])

  const handleChatAddToCart = useCallback(async (row) => {
    const productId = row?.id
    const quantity = Number(row?.cantidad) || 1
    let optimisticToast = false
    const result = await addToCart(productId, quantity, {
      id: productId,
      stock: row?.stock,
      precio: row?.precio,
      price: row?.precio,
      compra: row?.compra,
      iva: row?.iva,
      exento: row?.exento,
      aplicacion: row?.aplicacion,
    }, {
      onOptimistic: () => {
        optimisticToast = true
        showToast('Producto agregado al carrito', 'success')
      },
    })
    if (!result?.success) {
      if (result?.duplicate) {
        return
      }
      if (result?.needsAuth) {
        openAuthModal()
      }
      showToast(result?.error || 'No se pudo agregar al carrito', 'error')
      return
    }
    if (!optimisticToast) {
      showToast('Producto agregado al carrito', 'success')
    }
  }, [addToCart, openAuthModal, showToast])

  const handleChatBulkCommit = useCallback(async () => {
    const token = tokenAccess
    if (!token) {
      openAuthModal()
      showToast('Inicia sesión para enviar al carrito', 'error')
      return
    }
    try {
      const pending = takePendingChatBulk()
      if (!pending?.comparison) {
        showToast('No hay un Excel pendiente para enviar', 'error')
        return
      }
      const { submitBulkOrderSelection } = await import('@/features/profile/api/bulkContinue')
      const result = await submitBulkOrderSelection({
        results: pending.comparison.results || [],
        onlyOk: false,
        token,
        getExistingQty: (productId) => {
          const existing = cartItems.find((item) => String(item.id) === String(productId))
          return existing ? Number(existing.quantity) || 0 : 0
        },
        getExistingCartId: (productId) => {
          const existing = cartItems.find((item) => String(item.id) === String(productId))
          return existing?.cartId ?? null
        },
      })
      if (result.emptySelection || result.posted.length === 0) {
        showToast('No se pudo agregar ningún producto al carrito', 'error')
        return
      }
      await refreshCartFromApi()
      showToast(`${result.posted.length} producto(s) al carrito`, 'success')
    } catch (error) {
      showToast(error?.message || 'No se pudo agregar al carrito', 'error')
    }
  }, [tokenAccess, openAuthModal, showToast, cartItems, refreshCartFromApi])

  const handleChatFocusSearch = useCallback(() => {
    if (isStoreView) {
      showToast('Ya se encuentra viendo el catálogo', 'success')
    }
    setViewCue((current) => ({ ...current, search: Date.now() }))
  }, [isStoreView, showToast])

  const handleChatOpenStore = useCallback(() => {
    const already = isStoreView
    handleOpenCatalog()
    if (filterDrawerOpen) {
      closeDrawer()
    }
    if (already) {
      setViewCue((current) => ({ ...current, catalog: Date.now() }))
    }
    return already
  }, [isStoreView, handleOpenCatalog, filterDrawerOpen, closeDrawer])

  useEffect(() => {
    if (!viewCue.catalog) {
      return undefined
    }
    const node = catalogViewRef.current
    if (!node) {
      return undefined
    }
    node.classList.remove('landing__view--cue')
    void node.offsetWidth
    node.classList.add('landing__view--cue')
    const timer = window.setTimeout(() => {
      node.classList.remove('landing__view--cue')
    }, 600)
    return () => {
      window.clearTimeout(timer)
      node.classList.remove('landing__view--cue')
    }
  }, [viewCue.catalog])

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
          onCreateAbono={openOrderPayments}
          onViewAbonos={openOrderAbonos}
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
        orderingProductIds={orderingProductIds}
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
          searchCue={viewCue.search}
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
          <div className="landing__view" ref={catalogViewRef}>
            {renderContent()}
          </div>
        </main>
      </div>

      <FloatingCart />
      <StoreChatWidget
        onLogin={() => openAuthModal()}
        onOpenPriceList={handleOpenPriceList}
        onOpenStore={handleChatOpenStore}
        onFocusSearch={handleChatFocusSearch}
        onCatalogSearch={handleCatalogSearch}
        onCatalogFilter={handleCatalogFilter}
        onOpenBulkUpload={handleOpenBulkUpload}
        onOpenCart={() => openDrawer('cart')}
        onDownloadTemplate={handleDownloadTemplate}
        onChatAddToCart={handleChatAddToCart}
        onChatBulkCommit={handleChatBulkCommit}
        onRefreshCart={() => { void refreshCartFromApi() }}
      />
      <AppDrawer
        profileLaunchView={profileLaunchView}
        onProfileLaunchConsumed={() => setProfileLaunchView(null)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuthModal}
        onLogin={handleLogin}
      />

      <ProductDetailModal
        product={detailProduct}
        isOpen={Boolean(detailProduct)}
        onClose={() => setDetailProductId(null)}
        isInCart={detailProduct ? cartProductIds.has(String(detailProduct.id)) : false}
        isOrdering={detailProduct ? orderingProductIds.has(String(detailProduct.id)) : false}
        onOrder={handleOrderProduct}
      />
    </div>
  )
}
