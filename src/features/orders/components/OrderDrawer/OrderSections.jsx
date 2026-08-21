import { formatOrderDateTime, formatRelativeTime, formatRealAmount } from '@/features/orders/utils/orderFormat'
import { getCurrentFlowLabel } from '@/features/orders/constants/orderSteps'
import { PAYMENT_LIMIT_MISSING_MESSAGE } from '@/features/orders/utils/resolvePaymentDeadline'
import cloudDownloadIcon from '@/assets/icons/cloud-download.svg'
import eyeIcon from '@/assets/icons/eye.svg'
import { OrderPaymentAbonos } from './OrderPaymentAbonos'
import { namedControl, namedImage } from '@/shared/lib/namedControl'

export { OrderDeliveryContent } from './OrderDeliveryContent'

function PanelRow({ label, value, hint = '', highlight = false, subdued = false }) {
  return (
    <div className="content-list-data__row">
      <span className="content-list-data__label">{label}</span>
      <span
        className={`content-list-data__value ${highlight ? 'content-list-data__value--highlight' : ''} ${subdued ? 'content-list-data__value--subdued' : ''}`}
      >
        {value}
      </span>
      {hint ? <span className="content-list-data__hint">{hint}</span> : null}
    </div>
  )
}

export function OrderDetailsContent({ order, onDownloadPdf }) {
  const statusLabel = getCurrentFlowLabel(order.status ?? order.estado)
  const isCompleted = String(order.estado || '').toLowerCase().includes('envi')

  return (
    <>
      <div className="content-list-data__row content-list-data__row--inline">
        <span className="content-list-data__label"># Pedido</span>
        <div className="content-list-data__inline-value">
          <span className="content-list-data__value content-list-data__value--title">{order.id}</span>
          <button
            type="button"
            className="order-details__pdf-btn"
            onClick={onDownloadPdf}
            {...namedControl('Descargar PDF')}
          >
            <img src={cloudDownloadIcon} className="order-details__pdf-icon" {...namedImage('Descargar PDF')} />
          </button>
        </div>
      </div>
      <PanelRow label="# Factura" value={order.invoiceNumber} subdued />
      <PanelRow label="Tipo de pedido" value={order.orderType} />
      <PanelRow label="Fecha" value={formatOrderDateTime(order.createdAt)} highlight />
      <PanelRow label="Creación" value={formatRelativeTime(order.createdAt)} subdued />
      <div className="content-list-data__row">
        <span className="content-list-data__label">Estado</span>
        <span className={`content-list-data__status ${isCompleted ? 'content-list-data__status--done' : ''}`}>
          {statusLabel}
        </span>
      </div>
    </>
  )
}

export function OrderPaymentContent({ order, onOpenPayments, onVerifyProof }) {
  const { payment } = order
  const chosenType = String(payment.type ?? '').toLowerCase() || 'efectivo'
  const paidAmount = Number(payment.paidAmount ?? 0)
  const remainingAmount = Math.max(0, Number(payment.amount ?? order.total ?? 0) - paidAmount)
  const isCredito = chosenType === 'credito'
  const paidLabel = isCredito ? 'Abonado' : 'Pagado'

  return (
    <>
      <div className="content-list-data__row">
        <span className="content-list-data__label">Medio</span>
        <div className="order-payment__types" aria-label="Medio de pago del pedido">
          <span
            className="order-payment__type order-payment__type--active order-payment__type--chosen"
            {...namedControl(`Medio elegido en Finalizar: ${chosenType}`)}
          >
            {chosenType}
          </span>
        </div>
      </div>
      <PanelRow
        label="Fecha límite de pago"
        value={
          order.dateLimitLabel
          || (payment.deadline ? formatOrderDateTime(payment.deadline) : PAYMENT_LIMIT_MISSING_MESSAGE)
        }
        subdued
      />
      <PanelRow label="Monto total" value={formatRealAmount(payment.amount)} highlight />
      <PanelRow label={paidLabel} value={formatRealAmount(paidAmount)} />
      <PanelRow label="Pendiente" value={formatRealAmount(remainingAmount)} highlight />
      <OrderPaymentAbonos
        order={order}
        onOpenPayments={onOpenPayments}
        onVerifyProof={onVerifyProof}
      />
    </>
  )
}

export function OrderPackagingContent({ order, onViewProducts }) {
  const items = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : (Array.isArray(order.venta) ? order.venta : [])
  const productCount = items.length
  const totalUnits = items.reduce((sum, item) => {
    const qty = Number(item?.quantity ?? item?.cant ?? 0)
    return sum + (Number.isFinite(qty) ? qty : 0)
  }, 0)

  return (
    <>
      <div className="content-list-data__row">
        <span className="content-list-data__label">Productos</span>
        <div className="order-packaging__header">
          <span className="order-packaging__count">
            {productCount} producto{productCount === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            className="order-packaging__view-btn"
            onClick={() => onViewProducts?.(order)}
            {...namedControl('Ver productos')}
          >
            <img src={eyeIcon} className="order-packaging__view-icon" {...namedImage('Ver productos')} />
          </button>
        </div>
        <span className="content-list-data__hint">Líneas distintas en el pedido</span>
      </div>
      <PanelRow
        label="Cantidades"
        value={`${productCount}/${totalUnits}`}
        hint="Productos / unidades totales"
        highlight
      />
    </>
  )
}
