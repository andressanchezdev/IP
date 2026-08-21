import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '@/shared/ui/Modal/Modal'
import { SearchBar } from '@/shared/ui/SearchBar/SearchBar'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import { formatPrice } from '@/shared/lib/formatPrice'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import '@/features/auth/components/AuthModal/AuthModal.css'
import '@/features/cart/components/CartDrawer/CartDrawer.css'
import './OrderProductsModal.css'

function normalizeItems(order) {
  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items
  }
  if (Array.isArray(order?.venta)) {
    return order.venta
  }
  return []
}

function matchesProductSearch(item, query) {
  const haystack = [
    item.description,
    item.category,
    item.brand,
    item.model,
    item.reference,
    item.id,
    item.idpr,
  ]
    .map((value) => String(value ?? '').toLowerCase())
    .join(' ')

  return haystack.includes(query)
}

/**
 * Modal flotante (estilo login) con productos del pedido + búsqueda (Enter).
 */
export function OrderProductsModal({ isOpen, onClose, order }) {
  const [draftSearch, setDraftSearch] = useState('')
  const [committedSearch, setCommittedSearch] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setDraftSearch('')
    setCommittedSearch('')
  }, [isOpen, order?.id, order?.idventa])

  const items = useMemo(() => normalizeItems(order), [order])

  const visibleItems = useMemo(() => {
    const query = committedSearch.trim().toLowerCase()
    if (!query) {
      return items
    }
    return items.filter((item) => matchesProductSearch(item, query))
  }, [items, committedSearch])

  const handleSubmitSearch = useCallback(() => {
    setCommittedSearch(String(draftSearch || '').trim())
  }, [draftSearch])

  const handleClearSearch = useCallback(() => {
    setDraftSearch('')
    setCommittedSearch('')
  }, [])

  if (typeof document === 'undefined') {
    return null
  }

  const orderId = order?.id || order?.idventa || ''

  return createPortal((
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="auth-modal order-products-modal"
      backdropClassName="auth-modal-backdrop"
      labelledBy="order-products-modal-title"
    >
      <button
        type="button"
        className="auth-modal__close"
        onClick={onClose}
        {...namedControl('Cerrar')}
      >
        ×
      </button>

      <div className="auth-modal__form-col order-products-modal__form">
        <header className="order-products-modal__header">
          <h2 id="order-products-modal-title" className="auth-form__title">
            Productos del pedido
          </h2>
          <p className="auth-form__subtitle">
            {orderId ? `Pedido #${orderId}` : 'Detalle de productos'}
          </p>
          <SearchBar
            value={draftSearch}
            onChange={setDraftSearch}
            onSubmit={handleSubmitSearch}
            onClear={handleClearSearch}
            canClear={Boolean(draftSearch || committedSearch)}
            placeholder="Buscar productos (Enter)"
            ariaLabel="Buscar productos del pedido"
          />
        </header>

        <div className="order-products-modal__body">
          {visibleItems.length === 0 ? (
            <p className="order-products-modal__empty">
              {committedSearch
                ? 'Ningún producto coincide con la búsqueda.'
                : 'Este pedido no tiene productos.'}
            </p>
          ) : (
            <ul className="carrito-list order-products-modal__list">
              {visibleItems.map((item, index) => {
                const categoryText = String(item.category || '').trim()
                const descriptionText = String(item.description || `Producto #${item.idpr ?? item.id ?? index + 1}`).trim()
                const brandText = String(item.brand || '').trim()
                const modelText = String(item.model || '').trim()
                const imageSrc = item.imageUrl || item.brandLogo || item.brandLogoUrl
                const qty = Number(item.quantity ?? item.cant ?? 0)
                const price = Number(item.price ?? item.costo ?? 0)

                return (
                  <li key={item.id ?? `${item.idpr}-${index}`} className="carrito-card">
                    <div className="carrito-card__image-slot">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          className="carrito-card__image"
                          loading="lazy"
                          {...namedImage(descriptionText)}
                        />
                      ) : null}
                    </div>
                    <div className="carrito-card__content">
                      <div className="carrito-card__top">
                        <div className="carrito-card__title-row">
                          <span className="carrito-card__category">
                            {categoryText ? categoryText.toUpperCase() : '—'}
                          </span>
                          <span className="carrito-card__title-sep" aria-hidden="true">-</span>
                          <strong className="carrito-card__description">
                            {descriptionText.toUpperCase()}
                          </strong>
                        </div>
                        <BrandLogo
                          brand={item.brand}
                          logoUrl={item.brandLogo || item.brandLogoUrl}
                          className="carrito-card__brand"
                        />
                      </div>
                      <span className="carrito-card__meta">
                        {`${brandText.toUpperCase() || '—'} - ${modelText.toUpperCase() || '—'}`}
                      </span>
                      <span className="carrito-card__reference">
                        {String(item.reference || item.idpr || item.id || '').toUpperCase()}
                      </span>
                      <div className="carrito-card__footer">
                        <span className="carrito-card__qty-readonly">Cant: {qty}</span>
                        <div className="carrito-card__prices">
                          <span className="carrito-card__price">{formatPrice(price)}</span>
                          <span className="carrito-card__price-sep" aria-hidden="true">|</span>
                          <span className="carrito-card__total">{formatPrice(price * qty)}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <footer className="auth-form__actions order-products-modal__footer">
          <button
            type="button"
            className="auth-form__submit"
            onClick={onClose}
            {...namedControl('Cerrar')}
          >
            Cerrar
          </button>
        </footer>
      </div>
    </Modal>
  ), document.body)
}
