import { useContext, useMemo, useState } from 'react'
import searchIcon from '../../../assets/icons/search.svg'
import { AppContext } from '../../../context/AppContext'
import { useToast } from '../../../context/ToastContext'
import { formatPrice } from '../../../utils/formatPrice'
import { BrandLogo } from '../../ui/BrandLogo/BrandLogo'
import './CartDrawer.css'

export function CartDrawerContent() {
  const {
    cartItems,
    removeFromCart,
    setCartItemQuantity,
    initiateCheckout,
  } = useContext(AppContext)
  const { showToast } = useToast()
  const [cartSearchValue, setCartSearchValue] = useState('')

  const totalCart = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const filteredItems = useMemo(() => {
    const query = cartSearchValue.trim().toLowerCase()
    if (!query) {
      return cartItems
    }

    return cartItems.filter((item) =>
      [item.description, item.brand, item.model, item.reference, item.price.toString()]
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
          <p className="content-main-carrito__empty">El carrito está vacío.</p>
        ) : (
          <>
            <div className="carrito-search">
              <img src={searchIcon} alt="" className="carrito-search__icon" aria-hidden="true" />
              <input
                type="search"
                className="carrito-search__input"
                value={cartSearchValue}
                onChange={(event) => setCartSearchValue(event.target.value)}
                placeholder="Buscar por referencia, nombre o precio"
                aria-label="Buscar en el carrito"
              />
              <button
                type="button"
                className="carrito-search__clear"
                onClick={() => setCartSearchValue('')}
                disabled={!cartSearchValue.trim()}
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            </div>

            <div className="carrito-list-scroll">
              <ul className="carrito-list">
                {filteredItems.map((item) => (
                  <li key={item.id} className="carrito-card">
                    <div className="carrito-card__image-slot" aria-hidden="true" />

                    <div className="carrito-card__content">
                      <div className="carrito-card__top">
                        <strong className="carrito-card__description">{item.description}</strong>
                        <BrandLogo brand={item.brand} className="carrito-card__brand" />
                      </div>

                      <span className="carrito-card__meta">{`${item.brand} - ${item.model}`}</span>
                      <span className="carrito-card__reference">{item.reference}</span>

                      <div className="carrito-card__footer">
                        <input
                          type="number"
                          className="carrito-card__qty"
                          value={item.quantity}
                          min="1"
                          max={item.stock + item.quantity}
                          onChange={(event) => {
                            const nextQty = Number(event.target.value)
                            setCartItemQuantity(item.id, Number.isNaN(nextQty) ? item.quantity : nextQty)
                          }}
                          aria-label="Cantidad del producto"
                        />

                        <div className="carrito-card__prices">
                          <span className="carrito-card__price">{formatPrice(item.price)}</span>
                          <span className="carrito-card__price-sep" aria-hidden="true">|</span>
                          <span className="carrito-card__total">{formatPrice(item.price * item.quantity)}</span>
                        </div>

                        <button
                          type="button"
                          className="carrito-card__remove"
                          onClick={() => {
                            removeFromCart(item.id)
                            showToast('Producto retirado del carrito', 'success')
                          }}
                          aria-label="Eliminar producto"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
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
