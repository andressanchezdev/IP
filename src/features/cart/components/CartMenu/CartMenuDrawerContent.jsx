import { useMemo } from 'react'
import { useCart, useUi } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { summarizeCartItems } from '@/shared/lib/money'
import { downloadOrderPdf } from '@/shared/lib/downloadOrderPdf'
import cloudDownloadIcon from '@/assets/icons/cloud-download.svg'
import deleteAccountIcon from '@/assets/icons/delete-account.svg'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import { CartTotals } from '@/features/cart/components/CartTotals/CartTotals'
import '@/features/cart/components/CartDrawer/CartDrawer.css'

export function CartMenuDrawerContent() {
  const { cartItems, clearCart } = useCart()
  const { closeDrawer } = useUi()
  const { showToast } = useToast()

  const cartTotals = useMemo(() => summarizeCartItems(cartItems), [cartItems])

  return (
    <div className="content-main-carrito">
      <div className="content-main-aux-carrito">
        <div className="carrito-options-panel">
          <button
            type="button"
            className="drawer__menu-action"
            onClick={() => {
              downloadOrderPdf('Carrito de compras', cartItems, cartTotals.total, {
                filename: 'carrito-importadora.pdf',
                subtitle: 'Resumen de productos en carrito',
                metaLines: [`Items: ${cartItems.length}`],
                includeCartId: true,
                totals: cartTotals,
              })
              showToast('PDF descargado', 'success')
            }}
            disabled={cartItems.length === 0}
            {...namedControl('Descargar PDF del carrito')}
          >
            <img
              src={cloudDownloadIcon}
              className="drawer__menu-action-icon"
              {...namedImage('Descargar PDF')}
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
            {...namedControl('Limpiar carrito')}
          >
            <img
              src={deleteAccountIcon}
              className="drawer__menu-action-icon"
              {...namedImage('Limpiar carrito')}
            />
            Limpiar carrito
          </button>
        </div>
      </div>

      <div className="content-main-data-carrito content-main-data-carrito--stack">
        <CartTotals
          subtotal={cartTotals.subtotal}
          iva={cartTotals.iva}
          total={cartTotals.total}
        />
      </div>
    </div>
  )
}
