import { memo, useEffect, useMemo, useState } from 'react'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
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
  const productName = descriptionText || categoryText || reference || 'Producto'
  const orderLabel = isSoldOut ? 'Agotado' : isOrdered ? 'Ordenado' : `Ordenar ${productName}`
  const orderQuantity = Math.max(1, Math.min(maxQuantity, Number(quantity) || 1))

  const clampQuantity = (value) => Math.max(1, Math.min(maxQuantity, value))

  const handleChange = (event) => {
    const raw = event.target.value
    if (raw === '') {
      setQuantity('')
      return
    }

    const value = Number.parseInt(raw, 10)
    if (!Number.isFinite(value) || value < 0) {
      return
    }

    setQuantity(Math.min(maxQuantity, value))
  }

  const handleFocus = (event) => {
    event.target.select()
  }

  const handleMouseUp = (event) => {
    const input = event.currentTarget
    const rect = input.getBoundingClientRect()
    const clickedStepper = rect.width - (event.clientX - rect.left) <= 22
    if (clickedStepper) {
      return
    }
    event.preventDefault()
  }

  const handleKeyDown = (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return
    }

    event.preventDefault()
    const parsed = Number(quantity)
    const current = quantity === '' || !Number.isFinite(parsed) ? 0 : parsed
    const delta = event.key === 'ArrowUp' ? 1 : -1
    setQuantity(clampQuantity(current + delta))
  }

  const handleBlur = () => {
    if (quantity === '' || !Number.isFinite(Number(quantity)) || Number(quantity) < 1) {
      setQuantity(1)
      return
    }
    setQuantity(clampQuantity(Number(quantity)))
  }

  return (
    <article className="product-card">
      <div className="product-card__media">
        {mediaSrc ? (
          <img
            src={mediaSrc}
            className="product-card__image"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            {...namedImage(productName)}
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
              inputMode="numeric"
              className={`product-card__qty-input ${isOrdered || isSoldOut ? 'product-card__qty-input--hidden' : ''}`}
              value={quantity}
              min="1"
              max={maxQuantity}
              step="1"
              onChange={handleChange}
              onFocus={handleFocus}
              onMouseUp={handleMouseUp}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              disabled={isOrdered || isSoldOut}
              tabIndex={isOrdered || isSoldOut ? -1 : undefined}
              aria-hidden={isOrdered || isSoldOut}
              {...namedControl(`Cantidad de ${productName}`)}
            />
            <button
              type="button"
              className={`product-card__order ${isOrdered ? 'product-card__order--ordered' : ''} ${isSoldOut ? 'product-card__order--sold-out' : ''}`}
              onClick={() => {
                if (isOrdered || isSoldOut) return
                onOrder?.(id, orderQuantity)
              }}
              disabled={isSoldOut || isOrdered}
              {...namedControl(orderLabel)}
            >
              {isSoldOut ? 'Agotado' : isOrdered ? 'Ordenado' : 'Ordenar'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
})
