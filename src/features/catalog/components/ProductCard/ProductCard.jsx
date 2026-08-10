import { memo, useEffect, useMemo, useState } from 'react'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import './ProductCard.css'

function formatPrice(price) {
  return `$${Number(price || 0).toLocaleString('es-CO')}`
}

export const ProductCard = memo(function ProductCard({
  id,
  precio,
  price,
  description,
  category,
  model,
  brand,
  reference,
  stock = 0,
  imageUrl = '',
  brandLogo,
  brandLogoUrl,
  isInCart = false,
  onOrder,
}) {
  const [quantity, setQuantity] = useState(1)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [imageUrl])

  // Prioriza el campo API `precio`; `price` queda como alias interno.
  const displayPrice = precio ?? price
  const maxQuantity = useMemo(() => Math.max(1, stock), [stock])
  const isOrdered = isInCart
  const isSoldOut = stock <= 0
  const resolvedBrandLogo = brandLogo || brandLogoUrl
  // product-card__image usa imagen_producto → imageUrl. Fallback visual: campo imagen (logo).
  const mediaSrc = !imageFailed && imageUrl ? imageUrl : resolvedBrandLogo
  const descriptionText = String(description || '').trim()
  const categoryText = String(category || '').trim()

  const handleChange = (event) => {
    const value = Number(event.target.value)
    if (Number.isNaN(value)) {
      return
    }
    setQuantity(Math.max(1, Math.min(maxQuantity, value)))
  }

  return (
    <article className="product-card">
      <div className="product-card__media">
        {mediaSrc ? (
          <img
            src={mediaSrc}
            alt={descriptionText || categoryText || reference || 'Producto'}
            className="product-card__image"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="product-card__image product-card__image--empty" aria-hidden="true" />
        )}
      </div>

      <div className="product-card__body">
        <div className="product-card__price-row">
          <span className="product-card__price">{formatPrice(displayPrice)}</span>
          <div className="product-card__brand-logo-wrapper">
            <BrandLogo
              brand={brand}
              logoUrl={resolvedBrandLogo}
              className="product-card__brand-logo"
            />
          </div>
        </div>

        <div className="product-card__description">
          <p className="product-card__category">
            {categoryText ? categoryText.toUpperCase() : ''}
          </p>
          <span className="product-card__description-sep" aria-hidden="true"></span>
          <h3 className="product-card__description-text">
            {descriptionText ? descriptionText.toUpperCase() : ''}
          </h3>
        </div>

        <div className="product-card__meta-row">
          <span className="product-card__meta">
            {`${String(brand || '').toUpperCase()} - ${String(model || '').toUpperCase()}`}
          </span>
        </div>
        <span className="product-card__reference">{String(reference || '').toUpperCase()}</span>

        <div className="product-card__footer product-card__footer--row">
          <div className="product-card__order-row product-card__order-row--row">
            <input
              type="number"
              className={`product-card__qty-input ${isOrdered || isSoldOut ? 'product-card__qty-input--hidden' : ''}`}
              value={quantity}
              min="1"
              max={stock}
              onChange={handleChange}
              disabled={isOrdered || isSoldOut}
              tabIndex={isOrdered || isSoldOut ? -1 : undefined}
              aria-hidden={isOrdered || isSoldOut}
              aria-label="Cantidad de producto"
            />
            <button
              type="button"
              className={`product-card__order ${isOrdered ? 'product-card__order--ordered' : ''} ${isSoldOut ? 'product-card__order--sold-out' : ''}`}
              onClick={() => {
                if (isOrdered || isSoldOut) return
                onOrder?.(id, quantity)
              }}
              disabled={isSoldOut || isOrdered}
            >
              {isSoldOut ? 'Agotado' : isOrdered ? 'Ordenado' : 'Ordenar'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
})
