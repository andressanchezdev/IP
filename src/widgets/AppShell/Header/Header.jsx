import { useEffect, useRef, useState } from 'react'
import filterIcon from '@/assets/icons/filter.svg'
import newIcon from '@/assets/icons/new.svg'
import promoIcon from '@/assets/icons/promo.svg'
import cartIcon from '@/assets/icons/cart.svg'
import { SearchBar } from '@/shared/ui/SearchBar/SearchBar'
import { FilterButton } from '@/shared/ui/FilterButton/FilterButton'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import './Header.css'

export function Header({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Buscar',
  searchAriaLabel = 'Buscar',
  onClearSearch,
  canClearSearch,
  onFilter,
  onNew,
  onPromo,
  onCart,
  cartCount = 0,
  cartActive = false,
  filterActive = false,
  filterNuevosActive = false,
  filterPromocionesActive = false,
  showStoreFilters = true,
  showHistoryFilters = false,
  paymentMethods = [],
  paymentFilter = '',
  onPaymentFilterChange,
  statusOptions = [],
  statusFilter = '',
  onStatusFilterChange,
}) {
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false)
  const searchShellRef = useRef(null)
  const hasMobileTools = showStoreFilters || showHistoryFilters

  useEffect(() => {
    if (!mobileToolsOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (!searchShellRef.current?.contains(event.target)) {
        setMobileToolsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileToolsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileToolsOpen])

  useEffect(() => {
    setMobileToolsOpen(false)
  }, [showStoreFilters, showHistoryFilters])

  const openMobileTools = () => {
    if (hasMobileTools) {
      setMobileToolsOpen(true)
    }
  }

  return (
    <header className="header" {...namedControl('Encabezado de la tienda')}>
      <div className="header__main header__main--row">
        <div className="header__search header__search--row">
          <div
            ref={searchShellRef}
            className={`header__search-shell ${mobileToolsOpen ? 'header__search-shell--open' : ''}`}
          >
            <SearchBar
              value={searchValue}
              onChange={onSearchChange}
              onSubmit={onSearchSubmit}
              placeholder={searchPlaceholder}
              ariaLabel={searchAriaLabel}
              onClear={onClearSearch}
              canClear={canClearSearch}
              onFocus={openMobileTools}
            />

            {showStoreFilters && (
              <div
                className={`header__filters header__filters--row ${mobileToolsOpen ? 'header__filters--open' : ''}`}
                id="header-mobile-tools"
                {...namedControl('Filtros de catálogo')}
              >
              <FilterButton
                label="Filtrar"
                icon={filterIcon}
                variant="filter"
                onClick={onFilter}
                isActive={filterActive}
              />
              <FilterButton
                label="Nuevos"
                icon={newIcon}
                variant="new"
                onClick={onNew}
                isActive={filterNuevosActive}
              />
              <FilterButton
                label="Promoción"
                icon={promoIcon}
                variant="promo"
                onClick={onPromo}
                isActive={filterPromocionesActive}
              />
              </div>
            )}

            {showHistoryFilters && (
              <div
                className={`header__history-filters ${mobileToolsOpen ? 'header__history-filters--open' : ''}`}
              >
                <label className="header__payment-filter">
                  <select
                    className="header__payment-filter-select"
                    value={paymentFilter}
                    onChange={(event) => onPaymentFilterChange?.(event.target.value)}
                    onFocus={openMobileTools}
                    {...namedControl('Filtrar por medio de pago')}
                  >
                    <option value="">Medio de pago</option>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="header__payment-filter">
                  <select
                    className="header__payment-filter-select"
                    value={statusFilter}
                    onChange={(event) => onStatusFilterChange?.(event.target.value)}
                    onFocus={openMobileTools}
                    {...namedControl('Filtrar por estado')}
                  >
                    <option value="">Estado</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          className={`header__cart ${cartActive ? 'header__cart--active' : ''}`}
          onClick={onCart}
          {...namedControl(cartCount > 0 ? `Abrir carrito (${cartCount} productos)` : 'Abrir carrito')}
        >
          <img src={cartIcon} className="header__cart-icon" {...namedImage('Carrito')} />
          {cartCount > 0 && (
            <span className="header__cart-badge" aria-hidden="true">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
