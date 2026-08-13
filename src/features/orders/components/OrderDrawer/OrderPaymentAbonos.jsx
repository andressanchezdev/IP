import { formatRealAmount } from '@/features/orders/utils/orderFormat'
import { paymentTypeLabel } from '@/features/orders/utils/resolveCheckoutPaymentType'

function CashAbonos({ payments, remainingAmount, onOpenPayments }) {
  return (
    <div className="content-list-data__row">
      <span className="content-list-data__label">Abonos</span>
      <div className="order-payment__pagos">
        <button
          type="button"
          className="order-payment__counter order-payment__counter--link"
          onClick={onOpenPayments}
          aria-label="Ver pagos registrados"
        >
          {payments.length > 0 ? (
            payments.map((entry, index) => (
              <span
                key={`${entry.createdAt}-${index}`}
                className="order-payment__pill order-payment__pill--paid"
                title={formatRealAmount(entry.amount)}
              >
                {index + 1}
              </span>
            ))
          ) : (
            <span className="order-payment__empty">Sin abonos</span>
          )}
        </button>
        {remainingAmount > 0 && (
          <button
            type="button"
            className="order-payment__add-btn"
            onClick={onOpenPayments}
            aria-label="Agregar pago al pedido"
            title="Agregar pago"
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}

function TransferProofAbonos({ payment, remainingAmount, onVerifyProof, onOpenPayments }) {
  const details = payment?.checkoutDetails ?? payment?.details ?? {}
  const proofUrl = details.proofDataUrl || ''
  const proofName = details.proofName || 'Comprobante'
  const proofAmount = Number(details.amount) || Number(payment?.amount) || 0
  const verified = Boolean(details.proofVerified)
  const coversFull = proofAmount >= Number(payment?.amount ?? 0)

  return (
    <div className="content-list-data__row content-list-data__row--block">
      <span className="content-list-data__label">Comprobante</span>
      <div className="order-payment__proof">
        {proofUrl ? (
          proofUrl.startsWith('data:image/') ? (
            <a
              href={proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="order-payment__proof-preview"
              title={proofName}
            >
              <img src={proofUrl} alt={proofName} className="order-payment__proof-image" />
            </a>
          ) : (
            <a
              href={proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="order-payment__empty"
            >
              {proofName}
            </a>
          )
        ) : (
          <span className="order-payment__empty">{proofName || 'Sin comprobante'}</span>
        )}

        <label className="order-payment__proof-check">
          <input
            type="checkbox"
            checked={verified}
            disabled={verified}
            onChange={(event) => {
              if (event.target.checked) {
                onVerifyProof?.({ verified: true })
              }
            }}
          />
          <span>Comprobante real</span>
        </label>

        <span className="order-payment__proof-meta">
          Valor: {formatRealAmount(proofAmount)}
          {verified
            ? (coversFull ? ' · 100% cubierto' : ' · Abono parcial aplicado')
            : ' · Pendiente de validar'}
        </span>

        {!verified && remainingAmount > 0 && (
          <button
            type="button"
            className="order-payment__add-btn"
            onClick={onOpenPayments}
            aria-label="Registrar abono manual"
            title="Abono manual"
          >
            +
          </button>
        )}
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

  return (
    <div className="content-list-data__row content-list-data__row--block">
      <span className="content-list-data__label">Saldo pendiente</span>
      <div className="order-payment__credit">
        <strong className={toneClass}>{formatRealAmount(remainingAmount)}</strong>
        <span className="order-payment__proof-meta">
          Crédito usado: {formatRealAmount(usedCredit)}
          {availableCredit > 0 ? ` · Cupo: ${formatRealAmount(availableCredit)}` : ''}
        </span>
        <span className="order-payment__proof-meta">
          Medio: {paymentTypeLabel(payment?.type)} · Límite: {details.paymentLimitMonths ?? 2} meses
        </span>
        {remainingAmount > 0 && (
          <button
            type="button"
            className="order-payment__add-btn"
            onClick={onOpenPayments}
            aria-label="Registrar abono a crédito"
            title="Abonar a crédito"
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}

/** Campo Abonos / Comprobante / Saldo pendiente según medio del pedido. */
export function OrderPaymentAbonos({
  order,
  onOpenPayments,
  onVerifyProof,
}) {
  const payment = order?.payment ?? {}
  const type = String(payment.type ?? '').toLowerCase()
  const paidAmount = Number(payment.paidAmount ?? 0)
  const remainingAmount = Math.max(0, Number(payment.amount ?? order?.total ?? 0) - paidAmount)
  const payments = payment.payments ?? []

  if (type === 'transferencia') {
    return (
      <TransferProofAbonos
        payment={payment}
        remainingAmount={remainingAmount}
        onVerifyProof={onVerifyProof}
        onOpenPayments={onOpenPayments}
      />
    )
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

  return (
    <CashAbonos
      payments={payments}
      remainingAmount={remainingAmount}
      onOpenPayments={onOpenPayments}
    />
  )
}
