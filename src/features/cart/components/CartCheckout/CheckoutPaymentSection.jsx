import { Accordion } from '@/shared/ui/Accordion/Accordion'
import { formatPrice } from '@/shared/lib/formatPrice'
import { SummaryRow } from './SummaryRow'

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
            >
              {label}
            </button>
          ))}
        </div>

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
              />
              {transferProofName && (
                <span className="order-payments-panel__quota">Archivo: {transferProofName}</span>
              )}
            </label>
            <button
              type="button"
              className="content-main-data-carrito__checkout"
              onClick={onConfirmTransfer}
              disabled={!transferProofName}
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
              />
              <span>Transferencia</span>
            </label>
            <label className="filter-drawer-check">
              <input
                type="checkbox"
                checked={contraentregaMethod === 'efectivo'}
                onChange={() => onContraentregaMethodChange('efectivo')}
              />
              <span>Efectivo</span>
            </label>
            <button
              type="button"
              className="content-main-data-carrito__checkout"
              onClick={onConfirmContraentrega}
              disabled={!contraentregaMethod}
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
            <button
              type="button"
              className="content-main-data-carrito__checkout"
              onClick={onConfirmCredit}
            >
              Seleccionar
            </button>
          </div>
        )}
      </div>
    </Accordion>
  )
}
