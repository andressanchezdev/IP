import { useCallback, useContext, useDeferredValue, useEffect, useMemo, useState, startTransition } from 'react'
import { AppContext } from '../../context/AppContext'
import { useToast } from '../../context/ToastContext'
import { Sidebar } from '../../modules/layout/Sidebar/Sidebar'
import { Header } from '../../modules/layout/Header/Header'
import { AppDrawer } from '../../modules/layout/Drawer/AppDrawer'
import { AuthModal } from '../../modules/ui/AuthModal/AuthModal'
import { ProductCard } from '../../modules/ui/ProductCard/ProductCard'
import { FloatingCart } from '../../modules/ui/FloatingCart/FloatingCart'
import { PendingOrderCard, useShowEsperaVisual } from './components/PendingOrderCard'
import './components/PendingOrderCard.css'
import { matchesOrderIdSearch } from './utils/orderSearch'
import { formatPrice } from '../../utils/formatPrice'
import { confirmAction } from '../../utils/confirmAction'
import './LandingPage.css'

const HEADER_SEARCH = {
  tienda: {
    placeholder: 'Buscar productos',
    ariaLabel: 'Buscar productos',
  },
  espera: {
    placeholder: 'Buscar ',
    ariaLabel: 'Buscar pedido por número',
  },
  historial: {
    placeholder: 'Buscar',
    ariaLabel: 'Buscar pedido por número',
  },
}

export function LandingPage() {
  const {
    products,
    cartItems,
    pendingOrders,
    historyOrders,
    activeView,
    setActiveView,
    navigateToView,
    drawerOpen,
    drawerType,
    openDrawer,
    closeDrawer,
    openOrderDrawer,
    addToCart,
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
  } = useContext(AppContext)

  const { showToast } = useToast()
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState('')
  const deferredSearchValue = useDeferredValue(searchValue)
  const showEsperaVisual = useShowEsperaVisual()

  const isStoreView = activeView === 'tienda'
  const headerSearch = HEADER_SEARCH[activeView] ?? HEADER_SEARCH.tienda
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

  const filteredProducts = useMemo(() => {
    const query = deferredSearchValue.trim().toLowerCase()
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        [product.description, product.model, product.brand, product.reference, product.category]
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
  }, [products, filters, deferredSearchValue, filterNuevos, filterPromociones, withStock])

  const filteredPendingOrders = useMemo(() => {
    if (activeView !== 'espera') {
      return pendingOrders
    }

    return pendingOrders.filter((order) => matchesOrderIdSearch(order, deferredSearchValue))
  }, [activeView, pendingOrders, deferredSearchValue])

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
      return matchesOrderIdSearch(order, deferredSearchValue) && matchesPayment
    })
  }, [activeView, historyOrders, deferredSearchValue, historyPaymentFilter])

  const cartProductIds = useMemo(
    () => new Set(cartItems.map((item) => item.id)),
    [cartItems],
  )

  const handleOpenOrder = useCallback((orderId) => {
    openOrderDrawer(orderId)
  }, [openOrderDrawer])

  const handleOrderProduct = useCallback((productId, quantity) => {
    addToCart(productId, quantity)
    const product = products.find((item) => item.id === productId)
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

  const renderContent = () => {
    if (activeView === 'espera') {
      return (
        <div className="content-main-espera">
          {pendingOrders.length === 0 ? (
            <div className="landing__empty-state">Aún no hay pedidos en espera.</div>
          ) : filteredPendingOrders.length === 0 ? (
            <div className="landing__empty-state">No se encontraron pedidos con ese número.</div>
          ) : (
            <div className="content-main-espera__list">
              {filteredPendingOrders.map((order) => (
                <PendingOrderCard
                  key={order.id}
                  order={order}
                  onOpenOrder={handleOpenOrder}
                  showVisual={showEsperaVisual}
                />
              ))}
            </div>
          )}
        </div>
      )
    }

    if (activeView === 'historial') {
      return (
        <section className="landing__panel">
          <div className="landing__panel-header">
            <h2>Historial de compras</h2>
            <p>Resumen completo de todos los pedidos realizados.</p>
          </div>

          <div className="landing__table-wrap">
            <table className="landing__table landing__table--historial">
              <thead>
                <tr>
                  <th className="landing__table-col landing__table-col--priority">#Pedido</th>
                  <th className="landing__table-col landing__table-col--priority">Fecha</th>
                  <th className="landing__table-col landing__table-col--secondary">Fecha límite</th>
                  <th className="landing__table-col landing__table-col--secondary">Productos</th>
                  <th className="landing__table-col landing__table-col--secondary">Medio pago</th>
                  <th className="landing__table-col landing__table-col--secondary">Valor</th>
                  <th className="landing__table-col landing__table-col--priority">Estado</th>
                </tr>
              </thead>
              <tbody>
                {historyOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="landing__table-empty">No hay órdenes registradas.</td>
                  </tr>
                ) : filteredHistoryOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="landing__table-empty">No se encontraron pedidos con esos criterios.</td>
                  </tr>
                ) : (
                  filteredHistoryOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="landing__table-col landing__table-col--priority" data-label="#Pedido">
                        {order.id}
                      </td>
                      <td className="landing__table-col landing__table-col--priority" data-label="Fecha">
                        {order.createdAt}
                      </td>
                      <td className="landing__table-col landing__table-col--secondary" data-label="Fecha límite">
                        {order.dateLimit}
                      </td>
                      <td className="landing__table-col landing__table-col--secondary" data-label="Productos">
                        {order.items.map((item) => `${item.description} x${item.quantity}`).join(', ')}
                      </td>
                      <td className="landing__table-col landing__table-col--secondary" data-label="Medio pago">
                        {order.paymentMethod}
                      </td>
                      <td className="landing__table-col landing__table-col--secondary" data-label="Valor">
                        {formatPrice(order.total)}
                      </td>
                      <td className="landing__table-col landing__table-col--priority" data-label="Estado">
                        {order.status}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )
    }

    if (activeView !== 'tienda') {
      return null
    }

    return (
      <section className="landing__panel">
        {filteredProducts.length > 0 ? (
          <div className="landing__grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                isInCart={cartProductIds.has(product.id)}
                onOrder={handleOrderProduct}
              />
            ))}
          </div>
        ) : (
          <div className="landing__empty-state">No se encontraron productos con esos filtros.</div>
        )}
      </section>
    )
  }

  const handleProfileClick = () => {
    if (!isAuthenticated) {
      openAuthModal('login')
      return
    }
    openDrawer('profile')
  }

  const handleLogin = (credentials) => {
    const result = login(credentials)
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
