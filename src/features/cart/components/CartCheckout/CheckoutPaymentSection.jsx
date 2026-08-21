import { Accordion } from '@/shared/ui/Accordion/Accordion'
import { formatPrice } from '@/shared/lib/formatPrice'
import { SummaryRow } from './SummaryRow'
import { namedControl } from '@/shared/lib/namedControl'
import { FieldHint } from '@/shared/ui/FieldHint/FieldHint'
import '@/shared/ui/FieldHint/FieldHint.css'

const PAYMENT_TYPES = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'credito', label: 'Crédito' },
]

const CREDIT_DAYS_MIN = 1
const CREDIT_DAYS_MAX = 30

function clampCreditDays(raw) {
  if (raw === '') {
    return ''
  }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) {
    return ''
  }
  return Math.max(CREDIT_DAYS_MIN, Math.min(CREDIT_DAYS_MAX, parsed))
}

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
  totalToPay,
  creditAvailable,
  paymentPanel,
  onSelectPanel,
  paymentMethod,
  transferProofName,
  onTransferProofChange,
  onConfirmTransfer,
  onConfirmEfectivo,
  onConfirmCredit,
  creditLimitDays,
  onCreditLimitDaysChange,
}) {
  const methodHint = paymentPanel
    ? ''
    : 'Seleccione un método de pago para continuar'
  const transferHint = transferProofName
    ? ''
    : 'El comprobante de transferencia es obligatorio'
  const creditDaysHint = creditLimitDays === '' || creditLimitDays < CREDIT_DAYS_MIN || creditLimitDays > CREDIT_DAYS_MAX
    ? `Ingrese un plazo de ${CREDIT_DAYS_MIN} a ${CREDIT_DAYS_MAX} días`
    : ''
  const creditHint = totalToPay > creditAvailable
    ? 'El pedido supera el cupo de crédito disponible'
    : creditDaysHint

  return (
    <Accordion title="Método de pago" defaultOpen>
      <div className="checkout-finalize__box">
        <div className="order-payment__types order-payments-panel__types">
          {PAYMENT_TYPES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`order-payment__type order-payment__type--selectable ${paymentPanel === id || paymentMethod === id ? 'order-payment__type--active' : ''}`}
              onClick={() => onSelectPanel(id)}
              {...namedControl(label)}
            >
              {label}
            </button>
          ))}
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
            <SummaryRow label="Cuenta ahorros" value="01400000369" />
            <SummaryRow label="Valor total a transferir" value={formatPrice(totalToPay)} highlight />
            <SummaryRow label="Entidad bancaria" value="Bancolombia" />
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

        {paymentPanel === 'credito' && (
          <div className="checkout-finalize__payment-panel">
            <SummaryRow label="Total del pedido" value={formatPrice(totalToPay)} highlight />
            <SummaryRow
              label="Crédito disponible"
              value={formatPrice(creditAvailable)}
              valueClassName={creditAmountClass(creditAvailable)}
            />
            <label className="order-payments-panel__field">
              <span>Límite de pago (días)</span>
              <input
                type="number"
                inputMode="numeric"
                min={CREDIT_DAYS_MIN}
                max={CREDIT_DAYS_MAX}
                step="1"
                value={creditLimitDays}
                onChange={(event) => onCreditLimitDaysChange(clampCreditDays(event.target.value))}
                onBlur={() => {
                  if (creditLimitDays === '') {
                    onCreditLimitDaysChange(CREDIT_DAYS_MIN)
                  }
                }}
                className={creditDaysHint ? 'order-payments-panel__input--error' : ''}
                aria-invalid={Boolean(creditDaysHint)}
                {...namedControl('Límite de pago en días')}
              />
            </label>
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
