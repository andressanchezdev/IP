import { memo, useMemo, useState } from 'react'
import { BrandLogo } from '../BrandLogo/BrandLogo'
import './ProductCard.css'

function formatPrice(price) {
  return `$${price.toLocaleString('es-CO')}`
}

export const ProductCard = memo(function ProductCard({
  id,
  price,
  description,
  model,
  brand,
  reference,
  stock = 0,
  isInCart = false,
  onOrder,
}) {
  const [quantity, setQuantity] = useState(1)

  const maxQuantity = useMemo(() => Math.max(1, stock), [stock])
  const isOrdered = isInCart
  const isSoldOut = stock <= 0

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
        {/* Imagen de referencia: pendiente integrar URL dinámica por producto */}
        <img
          src="http://storage.googleapis.com/importadorapremiumonline/dependencias/img/productos/4S3F58050000/4S3F58050000-PASTILLAS%20DE%20FRENO%20TRASERO%20R15%20YAMAHA%20-%201.webp"
          alt={description}
          className="product-card__image"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="product-card__body">
        <div className="product-card__price-row">
          <span className="product-card__price">{formatPrice(price)}</span>
          <div className="product-card__brand-logo-wrapper">
            <BrandLogo brand={brand} className="product-card__brand-logo" />
          </div>
        </div>
        <h3 className="product-card__description">{description.toUpperCase()}</h3>
        <div className="product-card__meta-row">
          <span className="product-card__meta">{`${brand.toUpperCase()} - ${model.toUpperCase()}`}</span>
        </div>
        <span className="product-card__reference">{reference.toUpperCase()}</span>

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
