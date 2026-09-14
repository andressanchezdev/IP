import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/shared/ui/Modal/Modal'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import { ProductImageMagnify } from '../ProductImageMagnify/ProductImageMagnify'
import { PRODUCT_SELLOS, pickProductLoremVersion } from './productDetailCopy'
import '@/features/auth/components/AuthModal/AuthModal.css'
import './ProductDetailModal.css'

function formatPrice(price) {
  return `$${Number(price || 0).toLocaleString('es-CO')}`
}

function resolveGallery(product) {
  const urls = Array.isArray(product?.imageUrls)
    ? product.imageUrls.filter(Boolean)
    : []
  if (urls.length > 0) {
    return urls
  }
  if (product?.imageUrl) {
    return [product.imageUrl]
  }
  const logo = product?.brandLogo || product?.brandLogoUrl
  return logo ? [logo] : []
}

/**
 * Vista flotante "Ver detalles de producto" (patrón Modal / AuthModal).
 * Col1: thumbs + sellos · Col2: lupa · Col3: info + copy + Ordenar
 */
export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  isInCart = false,
  onOrder,
}) {
  const gallery = useMemo(() => resolveGallery(product), [product])
  const [activeIndex, setActiveIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setActiveIndex(0)
    setQuantity(1)
  }, [isOpen, product?.id])

  if (!product) {
    return null
  }

  const displayPrice = product.precio ?? product.price
  const stock = Number(product.stock) || 0
  const maxQuantity = Math.max(1, stock)
  const isSoldOut = stock <= 0
  const isOrdered = isInCart
  const descriptionText = String(product.description || '').trim()
  const categoryText = String(product.category || '').trim()
  const productName = descriptionText || categoryText || product.reference || 'Producto'
  const activeSrc = gallery[activeIndex] || gallery[0] || ''
  const loremText = pickProductLoremVersion(product.id)
  const orderQuantity = Math.max(1, Math.min(maxQuantity, Number(quantity) || 1))
  const orderLabel = isSoldOut ? 'Agotado' : isOrdered ? 'Ordenado' : `Ordenar ${productName}`

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

  const handleBlur = () => {
    if (quantity === '' || !Number.isFinite(Number(quantity)) || Number(quantity) < 1) {
      setQuantity(1)
      return
    }
    setQuantity(clampQuantity(Number(quantity)))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="product-detail-title"
      className="auth-modal product-detail-modal"
      backdropClassName="auth-modal-backdrop"
    >
      <div className="product-detail-modal__layout">
        <aside className="product-detail-modal__thumbs" aria-label="Imágenes del producto">
          {gallery.length > 0 ? (
            gallery.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                className={`product-detail-modal__thumb${index === activeIndex ? ' is-active' : ''}`}
                onClick={() => setActiveIndex(index)}
                {...namedControl(`Ver imagen ${index + 1} de ${productName}`)}
              >
                <img
                  src={src}
                  className="product-detail-modal__thumb-image"
                  loading="lazy"
                  decoding="async"
                  {...namedImage(`${productName} miniatura ${index + 1}`)}
                />
              </button>
            ))
          ) : (
            <div className="product-detail-modal__thumb product-detail-modal__thumb--empty" aria-hidden />
          )}

          <div className="product-detail-modal__thumbs-sellos" aria-label="Sellos del producto">
            {PRODUCT_SELLOS.map((sello) => (
              <img
                key={sello.src}
                src={sello.src}
                className="product-detail-modal__sello"
                loading="lazy"
                decoding="async"
                {...namedImage(sello.label)}
              />
            ))}
          </div>
        </aside>

        <div className="product-detail-modal__viewer" aria-label="Visualización del producto">
          <ProductImageMagnify src={activeSrc} alt={productName} />
        </div>

        <div className="product-detail-modal__info">
          <div className="product-detail-modal__info-top">
            <div className="product-detail-modal__price-row">
              <span className="product-detail-modal__price">{formatPrice(displayPrice)}</span>
              <BrandLogo
                brand={product.brand}
                logoUrl={product.brandLogo || product.brandLogoUrl}
                className="product-detail-modal__brand-logo"
              />
            </div>

            <p className="product-detail-modal__category">
              {categoryText ? categoryText.toUpperCase() : ''}
            </p>
            <h2 id="product-detail-title" className="product-detail-modal__title">
              {descriptionText ? descriptionText.toUpperCase() : productName.toUpperCase()}
            </h2>
            <p className="product-detail-modal__meta">
              {`${String(product.brand || '').toUpperCase()} - ${String(product.model || '').toUpperCase()}`}
            </p>
            <p className="product-detail-modal__reference">
              ref# {String(product.reference || '').toUpperCase()} - {isSoldOut ? 'Sin stock' : `Stock: ${stock}`}
            </p>
          </div>

          <div className="product-loremipsu" aria-label="Información Importadora Premium">
            <p className="product-loremipsu__text">{loremText}</p>
          </div>

          <div className="product-detail-modal__actions">
            <input
              type="number"
              inputMode="numeric"
              className={`product-detail-modal__qty${isOrdered || isSoldOut ? ' product-detail-modal__qty--hidden' : ''}`}
              value={quantity}
              min="1"
              max={maxQuantity}
              step="1"
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isOrdered || isSoldOut}
              tabIndex={isOrdered || isSoldOut ? -1 : undefined}
              aria-hidden={isOrdered || isSoldOut}
              {...namedControl(`Cantidad de ${productName}`)}
            />
            <button
              type="button"
              className={`product-detail-modal__order${isOrdered ? ' is-ordered' : ''}${isSoldOut ? ' is-sold-out' : ''}`}
              onClick={() => {
                if (isOrdered || isSoldOut) {
                  return
                }
                onOrder?.(product.id, orderQuantity)
              }}
              disabled={isSoldOut || isOrdered}
              {...namedControl(orderLabel)}
            >
              {isSoldOut ? 'Agotado' : isOrdered ? 'Ordenado' : 'Ordenar'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
