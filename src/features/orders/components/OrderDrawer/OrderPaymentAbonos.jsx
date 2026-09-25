import { formatOrderDateTime, formatRealAmount } from '@/features/orders/utils/orderFormat'
import { paymentTypeLabel } from '@/features/orders/utils/resolveCheckoutPaymentType'
import {
  ABONO_STATUS_LABEL,
  getCreditRemainingDue,
  getCreditRemainingForNewAbono,
  resolveAbonoStatus,
  sumVerifiedAbonos,
} from '@/features/orders/constants/abonoStatus'
import eyeIcon from '@/assets/icons/eye.svg'
import { namedControl, namedImage } from '@/shared/lib/namedControl'

function isTransferAbono(entry) {
  return String(entry?.type || '').toLowerCase() === 'transferencia'
}

function resolveAbonoProof(entry) {
  const details = entry?.details ?? {}
  return {
    url: String(details.proofDataUrl || '').trim(),
    name: String(details.proofName || 'Comprobante').trim() || 'Comprobante',
  }
}

/** Enlace/vista de comprobante (mismo patrón que transferencia del pedido). */
function AbonoProofLink({ entry }) {
  if (!isTransferAbono(entry)) {
    return <span className="order-payment__empty">—</span>
  }
  const { url, name } = resolveAbonoProof(entry)
  if (!url) {
    return <span className="order-payment__empty">—</span>
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="order-packaging__view-btn"
      {...namedControl(`Ver comprobante ${name}`)}
    >
      <img src={eyeIcon} className="order-packaging__view-icon" {...namedImage(`Ver comprobante ${name}`)} />
    </a>
  )
}

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

function CreditSaldoPendiente({ payment, orderTotal, remainingDue, remainingForNew, onOpenPayments }) {
  const details = payment?.checkoutDetails ?? {}
  const availableCredit = Number(details.availableCredit) || 0
  const usedCredit = Number(details.amount) || Number(orderTotal) || 0
  const payments = payment?.payments ?? []
  const verified = sumVerifiedAbonos(payments)
  const isClear = remainingDue <= 0
  const toneClass = isClear
    ? 'order-payment__saldo order-payment__saldo--ok'
    : 'order-payment__saldo order-payment__saldo--due'
  const limitDays = details.paymentLimitDays

  return (
    <div className="content-list-data__row content-list-data__row--block">
      <span className="content-list-data__label">Saldo / abonos</span>
      <div className="order-payment__credit">
        <strong className={toneClass}>{formatRealAmount(remainingDue)}</strong>
        <span className="order-payment__proof-meta">
          Crédito usado: {formatRealAmount(usedCredit)}
          {availableCredit > 0 ? ` · Cupo: ${formatRealAmount(availableCredit)}` : ''}
        </span>
        <span className="order-payment__proof-meta">
          Verificado: {formatRealAmount(verified)}
          {limitDays != null ? ` · Límite: ${limitDays} días` : ''}
        </span>
        <span className="order-payment__proof-meta">
          Medio: {paymentTypeLabel(payment?.type)}
        </span>
        {payments.length > 0 && (
          <div className="order-payment__pagos-wrap">
            <table className="order-payment__pagos">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medio</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Comp.</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((entry, index) => {
                  const status = resolveAbonoStatus(entry)
                  const createdLabel = formatOrderDateTime(entry.createdAt)
                  const statusLabel = ABONO_STATUS_LABEL[status] || status
                  return (
                    <tr key={entry.id || `${entry.createdAt}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{entry.type}</td>
                      <td>{formatRealAmount(entry.amount)}</td>
                      <td>
                        {statusLabel}
                        {status === 'novedad' && entry.noveltyReason
                          ? ` (${entry.noveltyReason})`
                          : ''}
                      </td>
                      <td>{createdLabel !== '—' ? createdLabel : '—'}</td>
                      <td>
                        <AbonoProofLink entry={entry} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {remainingForNew > 0 && (
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
 * - crédito → permite registrar abonos (estado inicial: revisión)
 * - efectivo → solo valor
 * - transferencia → solo ver comprobante
 */
export function OrderPaymentAbonos({
  order,
  onOpenPayments,
}) {
  const payment = order?.payment ?? {}
  const type = String(payment.type ?? '').toLowerCase()
  const total = Number(payment.amount ?? order?.total ?? 0)
  const payments = payment.payments ?? []
  const remainingDue = getCreditRemainingDue(total, payments)
  const remainingForNew = getCreditRemainingForNewAbono(total, payments)

  if (type === 'transferencia') {
    return <TransferProofReadonly payment={payment} />
  }

  if (type === 'credito') {
    return (
      <CreditSaldoPendiente
        payment={payment}
        orderTotal={order?.total}
        remainingDue={remainingDue}
        remainingForNew={remainingForNew}
        onOpenPayments={onOpenPayments}
      />
    )
  }

  return <CashPaymentReadonly payment={payment} orderTotal={order?.total} />
}
