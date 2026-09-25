import { memo, useEffect, useMemo, useState } from 'react'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import { copyTextToClipboard } from '@/shared/lib/copyTextToClipboard'
import { useToast } from '@/app/providers/ToastProvider'
import { isWeakDescription, productDisplayName } from '@/features/catalog/lib/catalogMatch'
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
  imageCardUrl = '',
  brandLogo,
  brandLogoUrl,
  isInCart = false,
  isOrdering = false,
  /** Primera fila visible: carga eager para mejorar LCP. */
  priority = false,
  onOrder,
  onOpenDetail,
}) {
  const { showToast } = useToast()
  const [quantity, setQuantity] = useState(1)
  /** card → thumb WebP; full → imagen_producto; logo → marca */
  const [imageTier, setImageTier] = useState('card')

  useEffect(() => {
    setImageTier(imageCardUrl ? 'card' : 'full')
  }, [imageUrl, imageCardUrl])

  // Prioriza el campo API `precio`; `price` queda como alias interno.
  const displayPrice = precio ?? price
  const maxQuantity = useMemo(() => Math.max(1, stock), [stock])
  const isOrdered = isInCart
  const isSoldOut = stock <= 0
  const resolvedBrandLogo = brandLogo || brandLogoUrl
  // Card: thumb liviana (*_card.webp). Fallback: full → logo marca.
  const mediaSrc = (() => {
    if (imageTier === 'card' && imageCardUrl) return imageCardUrl
    if (imageTier !== 'logo' && imageUrl) return imageUrl
    return resolvedBrandLogo || ''
  })()

  const handleImageError = () => {
    setImageTier((current) => {
      if (current === 'card' && imageUrl && imageUrl !== imageCardUrl) {
        return 'full'
      }
      return 'logo'
    })
  }
  const descriptionText = String(description || '').trim()
  const categoryText = String(category || '').trim()
  const modelText = String(model || '').trim()
  const titleText = isWeakDescription(descriptionText)
    ? modelText
    : descriptionText
  const metaText = `${String(brand || '').trim()} - ${String(model || '').trim()}`.replace(/^\s*-\s*|\s*-\s*$/g, '').trim()
  const referenceText = String(reference || '').trim()
  const productName = productDisplayName({ description, category, model, brand })
  const orderLabel = isSoldOut ? 'Agotado' : isOrdered ? 'Ordenado' : isOrdering ? `Ordenando ${productName}` : `Ordenar ${productName}`
  const orderQuantity = Math.max(1, Math.min(maxQuantity, Number(quantity) || 1))

  const clampQuantity = (value) => Math.max(1, Math.min(maxQuantity, value))

  const notifyStockLimit = () => {
    showToast('cantidad máxima alcanzada', 'error')
  }

  const applyQuantity = (next) => {
    const parsed = Number(next)
    if (!Number.isFinite(parsed)) {
      return
    }
    if (parsed >= maxQuantity) {
      notifyStockLimit()
    }
    setQuantity(clampQuantity(parsed))
  }

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

    applyQuantity(value)
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
    applyQuantity(current + delta)
  }

  const handleBlur = () => {
    if (quantity === '' || !Number.isFinite(Number(quantity)) || Number(quantity) < 1) {
      setQuantity(1)
      return
    }
    setQuantity(clampQuantity(Number(quantity)))
  }

  const copyField = async (kind, value) => {
    const text = String(value || '').trim().toUpperCase()
    if (kind !== 'referencia') {
      return
    }
    if (!text) {
      showToast('No hay referencia para copiar', 'error')
      return
    }
    const copied = await copyTextToClipboard(text)
    showToast(
      copied ? 'Referencia copiada' : 'No se pudo copiar la referencia',
      copied ? 'success' : 'error',
    )
  }

  const handleCopyKey = (event, kind, value) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }
    event.preventDefault()
    copyField(kind, value)
  }

  return (
    <article className="product-card">
      <div className="product-card__media">
        {mediaSrc ? (
          <button
            type="button"
            className="product-card__image-trigger"
            onClick={() => onOpenDetail?.(id)}
            {...namedControl(`Ver detalles de ${productName}`)}
          >
            <img
              src={mediaSrc}
              className="product-card__image"
              loading={priority ? 'eager' : 'lazy'}
              decoding={priority ? 'sync' : 'async'}
              fetchPriority={priority ? 'high' : 'auto'}
              onError={handleImageError}
              {...namedImage(productName)}
            />
          </button>
        ) : (
          <button
            type="button"
            className="product-card__image-trigger"
            onClick={() => onOpenDetail?.(id)}
            {...namedControl(`Ver detalles de ${productName}`)}
          >
            <div className="product-card__image product-card__image--empty" aria-hidden="true" />
          </button>
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
            {titleText ? titleText.toUpperCase() : ''}
          </h3>
        </div>

        <div className="product-card__meta-row">
          <span className="product-card__meta">
            {metaText ? metaText.toUpperCase() : ''}
          </span>
        </div>
        <span
          className="product-card__reference"
          role="button"
          tabIndex={referenceText ? 0 : -1}
          onClick={() => copyField('referencia', referenceText)}
          onKeyDown={(event) => handleCopyKey(event, 'referencia', referenceText)}
          {...namedControl(referenceText ? `Copiar referencia ${referenceText}` : 'Referencia')}
        >
          {referenceText ? referenceText.toUpperCase() : ''}
        </span>

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
                if (isOrdered || isSoldOut || isOrdering) return
                onOrder?.(id, orderQuantity)
              }}
              disabled={isSoldOut || isOrdered || isOrdering}
              {...namedControl(orderLabel)}
            >
              {isSoldOut ? 'Agotado' : isOrdered ? 'Ordenado' : isOrdering ? 'Ordenando…' : 'Ordenar'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
})
