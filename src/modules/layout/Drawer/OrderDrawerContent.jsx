import { useContext } from 'react'
import { AppContext } from '../../../context/AppContext'
import { useToast } from '../../../context/ToastContext'
import { formatOrderDateTime, formatRelativeTime, formatRealAmount } from '../../../features/landing/utils/orderFormat'
import { formatPrice } from '../../../utils/formatPrice'
import { BrandLogo } from '../../ui/BrandLogo/BrandLogo'
import { downloadOrderPdf } from '../../../utils/downloadOrderPdf'
import cloudDownloadIcon from '../../../assets/icons/cloud-download.svg'
import eyeIcon from '../../../assets/icons/eye.svg'
import { DrawerAccordionSection } from './DrawerAccordionSection'
import './OrderDrawer.css'
import './CartDrawer.css'

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

function OrderDetailsContent({ order, onDownloadPdf }) {
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
            aria-label="Descargar PDF"
          >
            <img src={cloudDownloadIcon} alt="" className="order-details__pdf-icon" aria-hidden="true" />
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

function OrderPaymentContent({ order, onOpenPayments }) {
  const { payment } = order
  const paymentTypes = ['efectivo', 'credito', 'transferencia']
  const paidAmount = Number(payment.paidAmount ?? 0)
  const remainingAmount = Math.max(0, Number(payment.amount ?? order.total ?? 0) - paidAmount)
  const payments = payment.payments ?? []

  return (
    <>
      <div className="content-list-data__row">
        <span className="content-list-data__label">Medio</span>
        <div className="order-payment__types">
          {paymentTypes.map((type) => (
            <span
              key={type}
              className={`order-payment__type ${payment.type === type ? 'order-payment__type--active' : ''}`}
            >
              {type}
            </span>
          ))}
        </div>
      </div>
      <PanelRow label="Fecha límite de pago" value={formatOrderDateTime(payment.deadline)} subdued />
      <PanelRow label="Monto total" value={formatRealAmount(payment.amount)} highlight />
      <PanelRow label="Abonado" value={formatRealAmount(paidAmount)} />
      <PanelRow label="Pendiente" value={formatRealAmount(remainingAmount)} highlight />
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
    </>
  )
}

function OrderPackagingContent({ order, productsOpen, onToggleProducts }) {
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
            aria-label={productsOpen ? 'Ocultar productos' : 'Ver productos'}
            aria-pressed={productsOpen}
          >
            <img src={eyeIcon} alt="" className="order-packaging__view-icon" aria-hidden="true" />
          </button>
        </div>
      </div>
      {productsOpen && (
        <div className="order-accordion__nested-list">
          <ul className="carrito-list">
            {order.items.map((item) => (
              <li key={item.id} className="carrito-card">
                <div className="carrito-card__image-slot" aria-hidden="true" />
                <div className="carrito-card__content">
                  <div className="carrito-card__top">
                    <strong className="carrito-card__description">{item.description}</strong>
                    <BrandLogo brand={item.brand} className="carrito-card__brand" />
                  </div>
                  <span className="carrito-card__meta">{`${item.brand} - ${item.model}`}</span>
                  <span className="carrito-card__reference">{item.reference}</span>
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
            ))}
          </ul>
        </div>
      )}
      <PanelRow label="Cantidades" value={`${packaging.packedQuantity}|${packaging.totalQuantity}`} highlight />
      <PanelRow label="Número de cajas" value={packaging.boxes} subdued />
      <PanelRow label="Número de bolsas" value={packaging.bags} subdued />
    </>
  )
}

function OrderDeliveryContent({ order }) {
  const { delivery } = order

  return (
    <>
      {order.client && (
        <>
          <PanelRow label="Cliente" value={order.client.fullName} highlight />
          <PanelRow label="Correo" value={order.client.email} subdued />
          <PanelRow label="Teléfono" value={order.client.phone} subdued />
        </>
      )}
      <PanelRow label="Fecha de entrega" value={formatOrderDateTime(delivery.date)} highlight />
      <PanelRow label="Dirección" value={delivery.address} highlight />
      <PanelRow label="Datos de entrega" value={delivery.notes} subdued />
      <PanelRow label="Quien entrega" value={delivery.deliveredBy} />
      <PanelRow label="Quien recibe" value={delivery.receivedBy} subdued />
    </>
  )
}

function OrderSalesPointContent({ order }) {
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

const ACCORDION_SECTIONS = [
  { id: 'details', label: 'Detalles' },
  { id: 'payment', label: 'Información de pago' },
  { id: 'packaging', label: 'Embalaje' },
  { id: 'delivery', label: 'Dirección de entrega' },
  { id: 'sales-point', label: 'Punto de venta' },
]

export function OrderDrawerContent({
  openSections,
  onToggleSection,
  onCloseSection,
  packagingProductsOpen,
  onTogglePackagingProducts,
}) {
  const { selectedOrder, setOrderSubView } = useContext(AppContext)
  const { showToast } = useToast()

  if (!selectedOrder) {
    return (
      <div className="content-list-data">
        <p>No se encontró el pedido seleccionado.</p>
      </div>
    )
  }

  const handleDownloadPdf = () => {
    downloadOrderPdf(`Pedido ${selectedOrder.id}`, selectedOrder.items, selectedOrder.total)
    showToast('PDF descargado', 'success')
  }

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'details':
        return <OrderDetailsContent order={selectedOrder} onDownloadPdf={handleDownloadPdf} />
      case 'payment':
        return (
          <OrderPaymentContent
            order={selectedOrder}
            onOpenPayments={() => setOrderSubView('payments')}
          />
        )
      case 'packaging':
        return (
          <OrderPackagingContent
            order={selectedOrder}
            productsOpen={packagingProductsOpen}
            onToggleProducts={onTogglePackagingProducts}
          />
        )
      case 'delivery':
        return <OrderDeliveryContent order={selectedOrder} />
      case 'sales-point':
        return <OrderSalesPointContent order={selectedOrder} />
      default:
        return null
    }
  }

  return (
    <div className="order-drawer-shell">
      <div className="order-accordion content-list-data">
        {ACCORDION_SECTIONS.map((section) => (
          <DrawerAccordionSection
            key={section.id}
            id={section.id}
            title={section.label}
            isOpen={openSections.includes(section.id)}
            onToggle={onToggleSection}
            onClose={onCloseSection}
          >
            {renderSectionContent(section.id)}
          </DrawerAccordionSection>
        ))}
      </div>
    </div>
  )
}
