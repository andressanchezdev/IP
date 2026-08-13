import { useCart, useUi } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { formatPrice } from '@/shared/lib/formatPrice'
import { downloadOrderPdf } from '@/shared/lib/downloadOrderPdf'
import cloudDownloadIcon from '@/assets/icons/cloud-download.svg'
import deleteAccountIcon from '@/assets/icons/delete-account.svg'
import '@/features/cart/components/CartDrawer/CartDrawer.css'

export function CartMenuDrawerContent() {
  const { cartItems, clearCart } = useCart()
  const { closeDrawer } = useUi()
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
              downloadOrderPdf('Carrito de compras', cartItems, totalCart, {
                filename: 'carrito-importadora.pdf',
                subtitle: 'Resumen de productos en carrito',
                metaLines: [`Items: ${cartItems.length}`],
                includeCartId: true,
              })
              showToast('PDF descargado', 'success')
            }}
            disabled={cartItems.length === 0}
          >
            <img
              src={cloudDownloadIcon}
              alt=""
              className="drawer__menu-action-icon"
              aria-hidden="true"
            />
            Descargar PDF
          </button>
          <button
            type="button"
            className="drawer__menu-action drawer__menu-action--danger"
            onClick={async () => {
              const result = await clearCart()
              if (!result?.success) {
                showToast(result?.error || 'No se pudo limpiar el carrito', 'error')
                return
              }
              showToast('Carrito limpiado', 'success')
              closeDrawer()
            }}
            disabled={cartItems.length === 0}
          >
            <img
              src={deleteAccountIcon}
              alt=""
              className="drawer__menu-action-icon"
              aria-hidden="true"
            />
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
