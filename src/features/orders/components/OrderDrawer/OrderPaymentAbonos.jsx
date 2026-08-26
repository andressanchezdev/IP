import { formatRealAmount } from '@/features/orders/utils/orderFormat'
import { paymentTypeLabel } from '@/features/orders/utils/resolveCheckoutPaymentType'
import { namedControl, namedImage } from '@/shared/lib/namedControl'

/** Efectivo: solo muestra el valor registrado al crear el pedido (sin abonos). */
function CashPaymentReadonly({ payment, orderTotal }) {
  const amount = Number(payment?.amount ?? payment?.checkoutDetails?.amountReceived ?? orderTotal) || 0

  return (
    <div className="content-list-data__row">
      <span className="content-list-data__label">Pago en efectivo</span>
      <span className="content-list-data__value content-list-data__value--highlight">
        {formatRealAmount(amount)}
      </span>
    </div>
  )
}

/** Transferencia: solo visualización del comprobante subido al crear el pedido. */
function TransferProofReadonly({ payment }) {
  const details = payment?.checkoutDetails ?? payment?.details ?? {}
  const proofUrl = details.proofDataUrl || ''
  const proofName = details.proofName || 'Comprobante'
  const proofAmount = Number(details.amount) || Number(payment?.amount) || 0

  return (
    <div className="content-list-data__row content-list-data__row--block">
      <span className="content-list-data__label">Comprobante de transferencia</span>
      <div className="order-payment__proof">
        {proofUrl ? (
          proofUrl.startsWith('data:image/') ? (
            <a
              href={proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="order-payment__proof-preview"
              {...namedControl(`Ver comprobante ${proofName}`)}
            >
              <img src={proofUrl} className="order-payment__proof-image" {...namedImage(proofName)} />
            </a>
          ) : (
            <a
              href={proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="order-payment__empty"
              {...namedControl(`Abrir comprobante ${proofName}`)}
            >
              {proofName}
            </a>
          )
        ) : (
          <span className="order-payment__empty">{proofName || 'Sin comprobante'}</span>
        )}

        <span className="order-payment__proof-meta">
          Valor: {formatRealAmount(proofAmount)}
        </span>
      </div>
    </div>
  )
}

function CreditSaldoPendiente({ payment, orderTotal, remainingAmount, onOpenPayments }) {
  const details = payment?.checkoutDetails ?? {}
  const availableCredit = Number(details.availableCredit) || 0
  const usedCredit = Number(details.amount) || Number(orderTotal) || 0
  const isClear = remainingAmount <= 0
  const toneClass = isClear
    ? 'order-payment__saldo order-payment__saldo--ok'
    : 'order-payment__saldo order-payment__saldo--due'
  const limitDays = details.paymentLimitDays

  return (
    <div className="content-list-data__row content-list-data__row--block">
      <span className="content-list-data__label">Saldo / abonos</span>
      <div className="order-payment__credit">
        <strong className={toneClass}>{formatRealAmount(remainingAmount)}</strong>
        <span className="order-payment__proof-meta">
          Crédito usado: {formatRealAmount(usedCredit)}
          {availableCredit > 0 ? ` · Cupo: ${formatRealAmount(availableCredit)}` : ''}
        </span>
        <span className="order-payment__proof-meta">
          Medio: {paymentTypeLabel(payment?.type)}
          {limitDays != null ? ` · Límite: ${limitDays} días` : ''}
        </span>
        {remainingAmount > 0 && (
          <button
            type="button"
            className="order-payment__add-btn"
            onClick={onOpenPayments}
            {...namedControl('Registrar abono a crédito')}
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Información de pago en drawer "+":
 * - crédito → permite registrar abonos
 * - efectivo → solo valor
 * - transferencia → solo ver comprobante
 */
export function OrderPaymentAbonos({
  order,
  onOpenPayments,
}) {
  const payment = order?.payment ?? {}
  const type = String(payment.type ?? '').toLowerCase()
  const paidAmount = Number(payment.paidAmount ?? 0)
  const remainingAmount = Math.max(0, Number(payment.amount ?? order?.total ?? 0) - paidAmount)

  if (type === 'transferencia') {
    return <TransferProofReadonly payment={payment} />
  }

  if (type === 'credito') {
    return (
      <CreditSaldoPendiente
        payment={payment}
        orderTotal={order?.total}
        remainingAmount={remainingAmount}
        onOpenPayments={onOpenPayments}
      />
    )
  }

  return <CashPaymentReadonly payment={payment} orderTotal={order?.total} />
}
