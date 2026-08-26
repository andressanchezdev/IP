import { Accordion } from '@/shared/ui/Accordion/Accordion'
import { formatPrice } from '@/shared/lib/formatPrice'
import { SummaryRow } from './SummaryRow'
import { namedControl } from '@/shared/lib/namedControl'
import { FieldHint } from '@/shared/ui/FieldHint/FieldHint'
import { CHECKOUT_PAYMENT_TYPES } from '@/features/orders/constants/paymentConfig'
import { TRANSFER_ACCOUNT } from '@/features/orders/constants/transferAccount'
import '@/shared/ui/FieldHint/FieldHint.css'

function creditAmountClass(amount) {
  if (amount > 0) {
    return 'checkout-finalize__amount--positive'
  }
  if (amount < 0) {
    return 'checkout-finalize__amount--negative'
  }
  return ''
}

export function CheckoutPaymentSection({
  isOpen,
  onToggle,
  totalToPay,
  creditAvailable,
  creditPaymentLimitDays = null,
  hasCredit = false,
  paymentPanel,
  onSelectPanel,
  paymentMethod,
  transferProofName,
  onTransferProofChange,
  onConfirmTransfer,
  onConfirmEfectivo,
  onConfirmCredit,
}) {
  const paymentTypes = hasCredit
    ? CHECKOUT_PAYMENT_TYPES
    : CHECKOUT_PAYMENT_TYPES.filter((entry) => entry.id !== 'credito')

  const methodHint = paymentPanel
    ? ''
    : 'Seleccione un método de pago para continuar'
  const transferHint = transferProofName
    ? ''
    : 'El comprobante de transferencia es obligatorio'
  const creditHint = totalToPay > creditAvailable
    ? 'El pedido supera el cupo de crédito disponible'
    : ''

  return (
    <Accordion
      title="Método de pago"
      isOpen={isOpen}
      onToggle={onToggle}
      defaultOpen
    >
      <div className="checkout-finalize__box">
        <div className="order-payment__types order-payments-panel__types">
          {paymentTypes.map(({ id, label }) => {
            const isSelected = paymentPanel === id || paymentMethod === id
            return (
              <button
                key={id}
                type="button"
                title={isSelected ? label : undefined}
                aria-pressed={isSelected}
                className={`order-payment__type order-payment__type--selectable ${isSelected ? 'order-payment__type--active' : ''}`}
                onClick={() => onSelectPanel(id)}
                {...namedControl(label)}
              >
                {label}
              </button>
            )
          })}
        </div>
        <FieldHint message={methodHint} />

        {paymentPanel === 'efectivo' && (
          <div className="checkout-finalize__payment-panel">
            <SummaryRow label="Valor a pagar en efectivo" value={formatPrice(totalToPay)} highlight />
            <FieldHint message="El pago se registrará en efectivo al confirmar el pedido" />
            <button
              type="button"
              className="content-main-data-carrito__checkout"
              onClick={onConfirmEfectivo}
              {...namedControl('Seleccionar efectivo')}
            >
              Seleccionar
            </button>
          </div>
        )}

        {paymentPanel === 'transferencia' && (
          <div className="checkout-finalize__payment-panel">
            <SummaryRow label={TRANSFER_ACCOUNT.accountLabel} value={TRANSFER_ACCOUNT.account} />
            <SummaryRow label="Valor total a transferir" value={formatPrice(totalToPay)} highlight />
            <SummaryRow label={TRANSFER_ACCOUNT.bankLabel} value={TRANSFER_ACCOUNT.bank} />
            <label className="order-payments-panel__field">
              <span>Comprobante de transferencia</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  onTransferProofChange(file)
                }}
                className={transferHint ? 'order-payments-panel__input--error' : ''}
                aria-invalid={Boolean(transferHint)}
                {...namedControl('Comprobante de transferencia')}
              />
              {transferProofName && (
                <span className="order-payments-panel__quota">Archivo: {transferProofName}</span>
              )}
              <FieldHint id="checkout-transfer-proof-hint" message={transferHint} />
            </label>
            <button
              type="button"
              className="content-main-data-carrito__checkout"
              onClick={onConfirmTransfer}
              disabled={!transferProofName}
              {...namedControl('Seleccionar transferencia')}
            >
              Seleccionar
            </button>
          </div>
        )}

        {hasCredit && paymentPanel === 'credito' && (
          <div className="checkout-finalize__payment-panel">
            {creditPaymentLimitDays != null && (
              <SummaryRow
                label="Pago en:"
                value={`${creditPaymentLimitDays} días`}
              />
            )}
            <SummaryRow
              label="Crédito disponible"
              value={formatPrice(creditAvailable)}
              valueClassName={creditAmountClass(creditAvailable)}
            />
            <SummaryRow label="Total del pedido" value={formatPrice(totalToPay)} highlight />
            <FieldHint message={creditHint} />
            <button
              type="button"
              className="content-main-data-carrito__checkout"
              onClick={onConfirmCredit}
              disabled={Boolean(creditHint)}
              {...namedControl('Seleccionar crédito')}
            >
              Seleccionar
            </button>
          </div>
        )}
      </div>
    </Accordion>
  )
}
