import { useContext } from 'react'
import { AppContext } from '../../../context/AppContext'
import { useToast } from '../../../context/ToastContext'
import { formatPrice } from '../../../utils/formatPrice'
import { downloadOrderPdf } from '../../../utils/downloadOrderPdf'
import './CartDrawer.css'

export function CartMenuDrawerContent() {
  const { cartItems, clearCart, closeDrawer } = useContext(AppContext)
  const { showToast } = useToast()

  const totalCart = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="content-main-carrito">
      <div className="content-main-aux-carrito">
        <div className="carrito-options-panel">
          <button
            type="button"
            className="drawer__menu-action"
            onClick={() => {
              downloadOrderPdf('Pedido Importadora Premium', cartItems, totalCart)
              showToast('PDF descargado', 'success')
            }}
            disabled={cartItems.length === 0}
          >
            Descargar PDF
          </button>
          <button
            type="button"
            className="drawer__menu-action drawer__menu-action--danger"
            onClick={() => {
              clearCart()
              closeDrawer()
              showToast('Carrito limpiado', 'success')
            }}
            disabled={cartItems.length === 0}
          >
            Limpiar carrito
          </button>
        </div>
      </div>

      <div className="content-main-data-carrito">
        <div className="content-main-data-carrito__total">
          <span>Total</span>
          <strong>{formatPrice(totalCart)}</strong>
        </div>
      </div>
    </div>
  )
}
