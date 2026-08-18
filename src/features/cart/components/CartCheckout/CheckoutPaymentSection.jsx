import { Accordion } from '@/shared/ui/Accordion/Accordion'
import { formatPrice } from '@/shared/lib/formatPrice'
import { SummaryRow } from './SummaryRow'
import { namedControl } from '@/shared/lib/namedControl'
import { FieldHint } from '@/shared/ui/FieldHint/FieldHint'
import '@/shared/ui/FieldHint/FieldHint.css'

const PAYMENT_TYPES = [
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'contraentrega', label: 'Contra entrega' },
  { id: 'credito', label: 'Crédito' },
]

export function CheckoutPaymentSection({
  totalToPay,
  creditAvailable,
  paymentPanel,
  onSelectPanel,
  paymentMethod,
  transferProofName,
  onTransferProofChange,
  contraentregaMethod,
  onContraentregaMethodChange,
  onConfirmTransfer,
  onConfirmContraentrega,
  onConfirmCredit,
}) {
  const methodHint = paymentPanel
    ? ''
    : 'Seleccione un método de pago para continuar'
  const transferHint = transferProofName
    ? ''
    : 'El comprobante de transferencia es obligatorio'
  const contraentregaHint = contraentregaMethod
    ? ''
    : 'Elija transferencia o efectivo para el pago en entrega'
  const creditHint = totalToPay > creditAvailable
    ? 'El pedido supera el cupo de crédito disponible'
    : ''

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

        {paymentPanel === 'contraentrega' && (
          <div className="checkout-finalize__payment-panel">
            <SummaryRow label="Valor del pedido" value={formatPrice(totalToPay)} highlight />
            <span className="checkout-finalize__box-title">Método de pago en entrega</span>
            <label className="filter-drawer-check">
              <input
                type="checkbox"
                checked={contraentregaMethod === 'transferencia'}
                onChange={() => onContraentregaMethodChange('transferencia')}
                {...namedControl('Pago en entrega por transferencia')}
              />
              <span>Transferencia</span>
            </label>
            <label className="filter-drawer-check">
              <input
                type="checkbox"
                checked={contraentregaMethod === 'efectivo'}
                onChange={() => onContraentregaMethodChange('efectivo')}
                {...namedControl('Pago en entrega en efectivo')}
              />
              <span>Efectivo</span>
            </label>
            <FieldHint message={contraentregaHint} />
            <button
              type="button"
              className="content-main-data-carrito__checkout"
              onClick={onConfirmContraentrega}
              disabled={!contraentregaMethod}
              {...namedControl('Seleccionar contra entrega')}
            >
              Seleccionar
            </button>
          </div>
        )}

        {paymentPanel === 'credito' && (
          <div className="checkout-finalize__payment-panel">
            <SummaryRow label="Total del pedido" value={formatPrice(totalToPay)} highlight />
            <SummaryRow label="Crédito disponible" value={formatPrice(creditAvailable)} />
            <SummaryRow label="Límite de pago" value="2 meses desde la creación" />
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
