import { useContext } from 'react'
import { AppContext } from '../../../context/AppContext'
import cartIcon from '../../../assets/icons/cart.svg'
import './FloatingCart.css'

export function FloatingCart() {
  const { cartItems, drawerOpen, openDrawer } = useContext(AppContext)

  if (drawerOpen) {
    return null
  }

  const cartCount = cartItems.length

  return (
    <button
      type="button"
      className="floating-cart"
      onClick={() => openDrawer('cart')}
      aria-label="Abrir carrito"
    >
      <img src={cartIcon} alt="" className="floating-cart__icon" aria-hidden="true" />
      {cartCount > 0 && (
        <span className="floating-cart__badge" aria-hidden="true">
          {cartCount}
        </span>
      )}
    </button>
  )
}
