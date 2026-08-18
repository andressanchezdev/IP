import { formatPrice } from '@/shared/lib/formatPrice'

export function CartTotals({ subtotal, iva, total }) {
  return (
    <div className="content-main-data-carrito__breakdown">
      <div className="content-main-data-carrito__row">
        <span>Subtotal</span>
        <strong>{formatPrice(subtotal)}</strong>
      </div>
      <div className="content-main-data-carrito__row">
        <span>IVA (19%)</span>
        <strong>{formatPrice(iva)}</strong>
      </div>
      <div className="content-main-data-carrito__row content-main-data-carrito__row--total">
        <span>Total</span>
        <strong>{formatPrice(total)}</strong>
      </div>
    </div>
  )
}
