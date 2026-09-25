import { useEffect, useMemo, useState } from 'react'
import { useCart, useCatalog } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { formatPrice } from '@/shared/lib/formatPrice'
import { summarizeCartItems, getIvaBreakdownLabel } from '@/shared/lib/money'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import { SearchBar } from '@/shared/ui/SearchBar/SearchBar'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import { CartTotals } from '@/features/cart/components/CartTotals/CartTotals'
import './CartDrawer.css'

function CartItemMedia({ item }) {
  const [tier, setTier] = useState(item.imageCardUrl ? 'card' : 'full')
  // Preferir thumb *_card.webp; fallback full → logo.
  const src = (() => {
    if (tier === 'card' && item.imageCardUrl) return item.imageCardUrl
    if (tier !== 'logo' && item.imageUrl) return item.imageUrl
    return item.brandLogo || item.brandLogoUrl || ''
  })()
  const imageAlt = String(item.description || item.category || item.reference || item.id || 'Producto').trim()

  if (!src) {
    return <div className="carrito-card__image-slot" aria-hidden="true" />
  }

  return (
    <div className="carrito-card__image-slot">
      <img
        src={src}
        className="carrito-card__image"
        loading="lazy"
        decoding="async"
        onError={() => {
          setTier((current) => {
            if (current === 'card' && item.imageUrl && item.imageUrl !== item.imageCardUrl) {
              return 'full'
            }
            return 'logo'
          })
        }}
        {...namedImage(imageAlt)}
      />
    </div>
  )
}

/** Mismo comportamiento de incrementador que ProductCard (landing). */
function CartCard({ item, catalogStock = 0, qtyBusy = false, onQuantityChange, onRemove }) {
  const categoryText = String(item.category || '').trim()
  const descriptionText = String(item.description || '').trim()
  const brandText = String(item.brand || '').trim()
  const modelText = String(item.model || '').trim()
  const referenceText = String(item.reference || item.id || '').trim()
  // Stock disponible = catálogo (API inicial + WS) + unidades ya en esta línea (API carrito).
  const maxQuantity = Math.max(1, (Number(catalogStock) || 0) + (Number(item.quantity) || 0))
  const unitPrice = Number(item.price) || 0
  const [quantity, setQuantity] = useState(() => Number(item.quantity) || 1)
  const { showToast } = useToast()

  useEffect(() => {
    setQuantity(Number(item.quantity) || 1)
  }, [item.quantity, item.cartId])

  const clampQuantity = (value) => Math.max(1, Math.min(maxQuantity, value))

  const notifyStockLimit = () => {
    showToast('cantidad máxima alcanzada', 'error')
  }

  /** Solo actualiza UI local; el PUT va en blur (valor ya establecido). */
  const applyLocalQuantity = (next) => {
    const parsed = Number(next)
    if (!Number.isFinite(parsed)) {
      return
    }
    if (parsed >= maxQuantity) {
      notifyStockLimit()
    }
    setQuantity(clampQuantity(parsed))
  }

  const commitQuantityToApi = (next) => {
    const clamped = clampQuantity(next)
    setQuantity(clamped)
    if (clamped !== Number(item.quantity)) {
      onQuantityChange?.(item.id, clamped)
    }
  }

  const handleChange = (event) => {
    if (qtyBusy) return
    const raw = event.target.value
    if (raw === '') {
      setQuantity('')
      return
    }

    const value = Number.parseInt(raw, 10)
    if (!Number.isFinite(value) || value < 0) {
      return
    }

    applyLocalQuantity(value)
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
    if (event.key === 'Enter') {
      event.currentTarget.blur()
      return
    }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return
    }

    event.preventDefault()
    if (qtyBusy) return
    const parsed = Number(quantity)
    const current = quantity === '' || !Number.isFinite(parsed) ? 0 : parsed
    const delta = event.key === 'ArrowUp' ? 1 : -1
    applyLocalQuantity(current + delta)
  }

  const handleBlur = () => {
    if (quantity === '' || !Number.isFinite(Number(quantity)) || Number(quantity) < 1) {
      commitQuantityToApi(1)
      return
    }
    commitQuantityToApi(Number(quantity))
  }

  return (
    <li className="carrito-card" data-cart-id={item.cartId ?? undefined} data-product-id={item.id}>
      <CartItemMedia item={item} />

      <div className="carrito-card__content">
        <div className="carrito-card__top">
          <div className="carrito-card__title-row">
            <span className="carrito-card__category">
              {categoryText ? categoryText.toUpperCase() : ''}
            </span>
            <span className="carrito-card__title-sep" aria-hidden="true"></span>
            <strong className="carrito-card__description">
              {descriptionText ? descriptionText.toUpperCase() : ''}
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
          {referenceText.toUpperCase()}
        </span>

        <div className="carrito-card__footer">
          <input
            type="number"
            inputMode="numeric"
            className="carrito-card__qty"
            value={quantity}
            min="1"
            max={maxQuantity}
            step="1"
            disabled={qtyBusy}
            onChange={handleChange}
            onFocus={handleFocus}
            onMouseUp={handleMouseUp}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            {...namedControl(`Cantidad de ${descriptionText || referenceText || 'producto'}`)}
          />

          <div className="carrito-card__prices">
            <span className="carrito-card__price">{formatPrice(unitPrice)}</span>
            <span className="carrito-card__price-sep" aria-hidden="true">|</span>
            <span className="carrito-card__total">
              {formatPrice(unitPrice * (Number(quantity) || Number(item.quantity) || 1))}
            </span>
          </div>

          <button
            type="button"
            className="carrito-card__remove"
            disabled={qtyBusy}
            onClick={() => {
              if (qtyBusy) return
              onRemove(item.id)
            }}
            {...namedControl(`Eliminar ${descriptionText || referenceText || 'producto'}`)}
          >
            <span className="carrito-card__remove-icon" aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  )
}

export function CartDrawerContent() {
  const {
    cartItems,
    removeFromCart,
    setCartItemQuantity,
    initiateCheckout,
    isMutatingCartQty,
  } = useCart()
  const { products } = useCatalog()
  const { showToast } = useToast()
  const [cartSearchValue, setCartSearchValue] = useState('')

  const catalogStockById = useMemo(() => {
    const map = new Map()
    products.forEach((product) => {
      map.set(String(product.id), Number(product.stock) || 0)
    })
    return map
  }, [products])

  const cartTotals = useMemo(() => summarizeCartItems(cartItems), [cartItems])
  const ivaLabel = useMemo(() => getIvaBreakdownLabel(cartItems), [cartItems])

  const filteredItems = useMemo(() => {
    const query = cartSearchValue.trim().toLowerCase()
    if (!query) {
      return cartItems
    }

    return cartItems.filter((item) =>
      [
        item.category,
        item.description,
        item.brand,
        item.model,
        item.reference,
        item.searching,
        item.price?.toString?.() ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [cartItems, cartSearchValue])

  const handleCheckout = () => {
    const result = initiateCheckout()
    if (result.needsAuth) {
      showToast('Inicie sesión para finalizar la compra', 'error')
    }
  }

  return (
    <div className="content-main-carrito">
      <div className="content-main-aux-carrito content-main-aux-carrito--scroll">
        {cartItems.length === 0 ? (
          <p className="content-main-carrito__empty">
            El carrito está vacío.
          </p>
        ) : (
          <>
            <div className="carrito-search">
              <SearchBar
                value={cartSearchValue}
                onChange={setCartSearchValue}
                onClear={() => setCartSearchValue('')}
                placeholder="Buscar en el carrito"
                ariaLabel="Buscar ítems del carrito"
              />
            </div>

            <div className="carrito-list-scroll">
              <ul className="carrito-list">
                {filteredItems.length === 0 ? (
                  <li className="content-main-carrito__empty">Sin coincidencias en el carrito</li>
                ) : (
                  filteredItems.map((item) => (
                    <CartCard
                      key={item.cartId ?? item.id}
                      item={item}
                      catalogStock={catalogStockById.get(String(item.id)) ?? 0}
                      qtyBusy={isMutatingCartQty(item.id)}
                      onQuantityChange={async (productId, quantity) => {
                        const result = await setCartItemQuantity(productId, quantity)
                        if (result?.duplicate || result?.skipped) return
                        if (!result?.success) {
                          showToast(result?.error || 'No se pudo actualizar la cantidad', 'error')
                        }
                      }}
                      onRemove={async (productId) => {
                        const result = await removeFromCart(productId, {
                          onOptimistic: () => {
                            showToast('Producto retirado del carrito', 'success')
                          },
                        })
                        if (result?.duplicate || result?.skipped) return
                        if (!result?.success) {
                          showToast(result?.error || 'No se pudo retirar el producto', 'error')
                        }
                      }}
                    />
                  ))
                )}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="content-main-data-carrito content-main-data-carrito--stack">
        <CartTotals
          subtotal={cartTotals.subtotal}
          iva={cartTotals.iva}
          ivaLabel={ivaLabel}
          total={cartTotals.total}
        />
        <button
          type="button"
          className="content-main-data-carrito__checkout"
          onClick={handleCheckout}
          disabled={cartItems.length === 0}
          {...namedControl('Finalizar compra')}
        >
          Finalizar compra
        </button>
      </div>
    </div>
  )
}
