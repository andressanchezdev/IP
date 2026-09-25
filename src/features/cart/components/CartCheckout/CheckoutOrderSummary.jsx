import { Accordion } from '@/shared/ui/Accordion/Accordion'
import { formatPrice } from '@/shared/lib/formatPrice'
import checkGreenIcon from '@/assets/icons/check-green.svg'
import editIcon from '@/assets/icons/edit.svg'
import { SummaryRow } from './SummaryRow'
import { namedControl, namedImage } from '@/shared/lib/namedControl'

export function CheckoutOrderSummary({
  isOpen,
  onToggle,
  subtotal,
  iva,
  ivaLabel = 'IVA',
  totalToPay,
  hasDelivery,
  deliveryAddress,
  paymentConfirmed,
  paymentMethod,
  paymentDetails,
  onEditDelivery,
  onEditPayment,
}) {
  return (
    <Accordion
      title="Información del pedido"
      isOpen={isOpen}
      onToggle={onToggle}
      defaultOpen
    >
      <div className="checkout-finalize__box">
        <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
        <SummaryRow label="Costo de envío" value="Gratis" />
        <SummaryRow label={ivaLabel} value={formatPrice(iva)} />
        <SummaryRow label="Total a pagar" value={formatPrice(totalToPay)} highlight />
        {hasDelivery && (
          <div className="checkout-finalize__delivery-note">
            <div className="checkout-finalize__field-head">
              <span>Entrega</span>
              <button
                type="button"
                className="checkout-finalize__edit"
                onClick={onEditDelivery}
                {...namedControl('Editar entrega')}
              >
                <img src={editIcon} width={16} height={16} {...namedImage('Editar entrega')} />
              </button>
            </div>
            <strong className="checkout-finalize__confirmed-value">
              <img
                src={checkGreenIcon}
                className="checkout-finalize__check"
                width={16}
                height={16}
                alt=""
                {...namedImage('Entrega confirmada')}
              />
              {deliveryAddress}
            </strong>
          </div>
        )}
        {paymentConfirmed && (
          <div className="checkout-finalize__delivery-note">
            <div className="checkout-finalize__field-head">
              <span>Pago</span>
              <button
                type="button"
                className="checkout-finalize__edit"
                onClick={onEditPayment}
                {...namedControl('Editar método de pago')}
              >
                <img src={editIcon} width={16} height={16} {...namedImage('Editar método de pago')} />
              </button>
            </div>
            <strong className="checkout-finalize__confirmed-value">
              <img
                src={checkGreenIcon}
                className="checkout-finalize__check"
                width={16}
                height={16}
                alt=""
                {...namedImage('Pago confirmado')}
              />
              {paymentMethod === 'efectivo' && 'Efectivo'}
              {paymentMethod === 'transferencia' && 'Transferencia'}
              {paymentMethod === 'credito' && 'Crédito'}
            </strong>
          </div>
        )}
      </div>
    </Accordion>
  )
}
