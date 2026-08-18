import { useCart, useUi } from '@/app/providers'
import cartIcon from '@/assets/icons/cart.svg'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import './FloatingCart.css'

export function FloatingCart() {
  const { cartItems } = useCart()
  const { drawerOpen, openDrawer } = useUi()

  if (drawerOpen) {
    return null
  }

  const cartCount = cartItems.length

  return (
    <button
      type="button"
      className="floating-cart"
      onClick={() => openDrawer('cart')}
      {...namedControl(cartCount > 0 ? `Abrir carrito (${cartCount} productos)` : 'Abrir carrito')}
    >
      <img src={cartIcon} className="floating-cart__icon" {...namedImage('Carrito')} />
      {cartCount > 0 && (
        <span className="floating-cart__badge" aria-hidden="true">
          {cartCount}
        </span>
      )}
    </button>
  )
}
