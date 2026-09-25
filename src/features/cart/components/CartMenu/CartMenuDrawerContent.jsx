import { useMemo } from 'react'
import { useCart, useUi } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { summarizeCartItems, getIvaBreakdownLabel } from '@/shared/lib/money'
import { downloadOrderPdf } from '@/shared/lib/downloadOrderPdf'
import { useActionLock } from '@/shared/lib/useActionLock'
import cloudDownloadIcon from '@/assets/icons/cloud-download.svg'
import deleteAccountIcon from '@/assets/icons/delete-account.svg'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import { CartTotals } from '@/features/cart/components/CartTotals/CartTotals'
import '@/features/cart/components/CartDrawer/CartDrawer.css'

export function CartMenuDrawerContent() {
  const { cartItems, clearCart, isClearingCart } = useCart()
  const { closeDrawer } = useUi()
  const { showToast } = useToast()
  const { busy, run } = useActionLock()

  const cartTotals = useMemo(() => summarizeCartItems(cartItems), [cartItems])
  const ivaLabel = useMemo(() => getIvaBreakdownLabel(cartItems), [cartItems])
  const clearBusy = busy || isClearingCart

  return (
    <div className="content-main-carrito">
      <div className="content-main-aux-carrito">
        <div className="carrito-options-panel">
          <button
            type="button"
            className="drawer__menu-action"
            onClick={() => {
              void run(async () => {
                downloadOrderPdf('Carrito de compras', cartItems, cartTotals.total, {
                  filename: 'carrito-importadora.pdf',
                  subtitle: 'Resumen de productos en carrito',
                  metaLines: [`Items: ${cartItems.length}`],
                  includeCartId: true,
                  totals: cartTotals,
                })
                showToast('PDF descargado', 'success')
              })
            }}
            disabled={cartItems.length === 0 || busy}
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
            onClick={() => {
              void run(async () => {
                const result = await clearCart()
                if (result?.skipped || result?.duplicate) return
                if (!result?.success) {
                  showToast(result?.error || 'No se pudo limpiar el carrito', 'error')
                  return
                }
                showToast('Carrito limpiado', 'success')
                closeDrawer()
              })
            }}
            disabled={cartItems.length === 0 || clearBusy}
            {...namedControl(clearBusy ? 'Limpiando carrito…' : 'Limpiar carrito')}
          >
            <img
              src={deleteAccountIcon}
              className="drawer__menu-action-icon"
              {...namedImage('Limpiar carrito')}
            />
            {clearBusy ? 'Limpiando…' : 'Limpiar carrito'}
          </button>
        </div>
      </div>

      <div className="content-main-data-carrito content-main-data-carrito--stack">
        <CartTotals
          subtotal={cartTotals.subtotal}
          iva={cartTotals.iva}
          ivaLabel={ivaLabel}
          total={cartTotals.total}
        />
      </div>
    </div>
  )
}
