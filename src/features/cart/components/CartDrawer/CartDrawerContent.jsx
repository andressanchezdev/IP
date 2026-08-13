import { useMemo, useState } from 'react'
import { useCart, useCatalog } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { formatPrice } from '@/shared/lib/formatPrice'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import { SearchBar } from '@/shared/ui/SearchBar/SearchBar'
import './CartDrawer.css'

function CartItemMedia({ item }) {
  const [failed, setFailed] = useState(false)
  // imageUrl viene de imagen_producto / imagenArray (mapApiCartItem). Fallback: logo (imagen).
  const src = !failed && item.imageUrl ? item.imageUrl : (item.brandLogo || item.brandLogoUrl)

  if (!src) {
    return <div className="carrito-card__image-slot" aria-hidden="true" />
  }

  return (
    <div className="carrito-card__image-slot">
      <img
        src={src}
        alt=""
        className="carrito-card__image"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

function CartCard({ item, catalogStock = 0, onQuantityChange, onRemove }) {
  const categoryText = String(item.category || '').trim()
  const descriptionText = String(item.description || '').trim()
  const brandText = String(item.brand || '').trim()
  const modelText = String(item.model || '').trim()
  const referenceText = String(item.reference || item.id || '').trim()
  // Stock disponible = catálogo (API inicial + WS) + unidades ya en esta línea (API carrito).
  const maxQty = Math.max(1, (Number(catalogStock) || 0) + (Number(item.quantity) || 0))
  const unitPrice = Number(item.price) || 0

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
            className="carrito-card__qty"
            value={item.quantity}
            min="1"
            max={maxQty}
            onChange={(event) => {
              const nextQty = Number(event.target.value)
              onQuantityChange(item.id, Number.isNaN(nextQty) ? item.quantity : nextQty)
            }}
            aria-label="Cantidad del producto"
          />

          <div className="carrito-card__prices">
            <span className="carrito-card__price">{formatPrice(unitPrice)}</span>
            <span className="carrito-card__price-sep" aria-hidden="true">|</span>
            <span className="carrito-card__total">{formatPrice(unitPrice * item.quantity)}</span>
          </div>

          <button
            type="button"
            className="carrito-card__remove"
            onClick={() => onRemove(item.id)}
            aria-label="Eliminar producto"
          >
            🗑
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

  const totalCart = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

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
      <div className="content-main-aux-carrito">
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
                      onQuantityChange={async (productId, quantity) => {
                        const result = await setCartItemQuantity(productId, quantity)
                        if (!result?.success) {
                          showToast(result?.error || 'No se pudo actualizar la cantidad', 'error')
                        }
                      }}
                      onRemove={async (productId) => {
                        const result = await removeFromCart(productId)
                        if (!result?.success) {
                          showToast(result?.error || 'No se pudo retirar el producto', 'error')
                          return
                        }
                        showToast('Producto retirado del carrito', 'success')
                      }}
                    />
                  ))
                )}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="content-main-data-carrito">
        <div className="content-main-data-carrito__total">
          <span>Total</span>
          <strong>{formatPrice(totalCart)}</strong>
        </div>
        <button
          type="button"
          className="content-main-data-carrito__checkout"
          onClick={handleCheckout}
          disabled={cartItems.length === 0}
        >
          Finalizar compra
        </button>
      </div>
    </div>
  )
}
