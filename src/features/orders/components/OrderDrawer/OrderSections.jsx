import { formatOrderDateTime, formatRelativeTime, formatRealAmount } from '@/features/orders/utils/orderFormat'
import { formatPrice } from '@/shared/lib/formatPrice'
import { BrandLogo } from '@/shared/ui/BrandLogo/BrandLogo'
import cloudDownloadIcon from '@/assets/icons/cloud-download.svg'
import eyeIcon from '@/assets/icons/eye.svg'
import { OrderPaymentAbonos } from './OrderPaymentAbonos'
import { namedControl, namedImage } from '@/shared/lib/namedControl'

export { OrderDeliveryContent } from './OrderDeliveryContent'

function PanelRow({ label, value, highlight = false, subdued = false }) {
  return (
    <div className="content-list-data__row">
      <span className="content-list-data__label">{label}</span>
      <span
        className={`content-list-data__value ${highlight ? 'content-list-data__value--highlight' : ''} ${subdued ? 'content-list-data__value--subdued' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

export function OrderDetailsContent({ order, onDownloadPdf }) {
  const isCompleted = order.processStatus === 'completado'

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
          {order.processStatus}
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
      <PanelRow label="Fecha límite de pago" value={formatOrderDateTime(payment.deadline)} subdued />
      <PanelRow label="Monto total" value={formatRealAmount(payment.amount)} highlight />
      <PanelRow label="Abonado" value={formatRealAmount(paidAmount)} />
      <PanelRow label="Pendiente" value={formatRealAmount(remainingAmount)} highlight />
      <OrderPaymentAbonos
        order={order}
        onOpenPayments={onOpenPayments}
        onVerifyProof={onVerifyProof}
      />
    </>
  )
}

export function OrderPackagingContent({ order, productsOpen, onToggleProducts }) {
  const { packaging } = order
  const productCount = order.items?.length ?? 0

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
            className={`order-packaging__view-btn ${productsOpen ? 'order-packaging__view-btn--active' : ''}`}
            onClick={onToggleProducts}
            aria-pressed={productsOpen}
            {...namedControl(productsOpen ? 'Ocultar productos' : 'Ver productos')}
          >
            <img src={eyeIcon} className="order-packaging__view-icon" {...namedImage(productsOpen ? 'Ocultar productos' : 'Ver productos')} />
          </button>
        </div>
      </div>
      {productsOpen && (
        <div className="order-accordion__nested-list">
          <ul className="carrito-list">
            {order.items.map((item) => {
              const categoryText = String(item.category || '').trim()
              const descriptionText = String(item.description || '').trim()
              const brandText = String(item.brand || '').trim()
              const modelText = String(item.model || '').trim()
              const imageSrc = item.imageUrl || item.brandLogo || item.brandLogoUrl

              return (
                <li key={item.id} className="carrito-card">
                  <div className="carrito-card__image-slot">
                    {imageSrc ? (
                      <img src={imageSrc} className="carrito-card__image" loading="lazy" {...namedImage(descriptionText || categoryText || item.reference || 'Producto')} />
                    ) : null}
                  </div>
                  <div className="carrito-card__content">
                    <div className="carrito-card__top">
                      <div className="carrito-card__title-row">
                        <span className="carrito-card__category">
                          {categoryText ? categoryText.toUpperCase() : '—'}
                        </span>
                        <span className="carrito-card__title-sep" aria-hidden="true">-</span>
                        <strong className="carrito-card__description">
                          {descriptionText ? descriptionText.toUpperCase() : ''}
                        </strong>
                      </div>
                      <BrandLogo brand={item.brand} logoUrl={item.brandLogo || item.brandLogoUrl} className="carrito-card__brand" />
                    </div>
                    <span className="carrito-card__meta">
                      {`${brandText.toUpperCase() || '—'} - ${modelText.toUpperCase() || '—'}`}
                    </span>
                    <span className="carrito-card__reference">
                      {String(item.reference || item.id || '').toUpperCase()}
                    </span>
                    <div className="carrito-card__footer">
                      <span className="carrito-card__qty-readonly">Cant: {item.quantity}</span>
                      <div className="carrito-card__prices">
                        <span className="carrito-card__price">{formatPrice(item.price)}</span>
                        <span className="carrito-card__price-sep" aria-hidden="true">|</span>
                        <span className="carrito-card__total">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <PanelRow label="Cantidades" value={`${packaging.packedQuantity}|${packaging.totalQuantity}`} highlight />
      <PanelRow label="Número de cajas" value={packaging.boxes} subdued />
      <PanelRow label="Número de bolsas" value={packaging.bags} subdued />
    </>
  )
}

export function OrderSalesPointContent({ order }) {
  return (
    <>
      {order.salesPoints.map((point) => (
        <div key={point.id} className="order-sales-point__item">
          <div className="order-sales-point__name">{point.name}</div>
          <div className="order-sales-point__id">ID: {point.id}</div>
        </div>
      ))}
    </>
  )
}
