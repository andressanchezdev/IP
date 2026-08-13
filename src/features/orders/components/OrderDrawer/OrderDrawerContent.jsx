import { useOrders } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { downloadOrderPdf } from '@/shared/lib/downloadOrderPdf'
import { DrawerAccordionSection } from '@/shared/ui/Drawer/DrawerAccordionSection'
import {
  OrderDeliveryContent,
  OrderDetailsContent,
  OrderPackagingContent,
  OrderPaymentContent,
  OrderSalesPointContent,
} from './OrderSections'
import './OrderDrawer.css'
import '@/features/cart/components/CartDrawer/CartDrawer.css'

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
  const { selectedOrder, setOrderSubView, verifyTransferProof } = useOrders()
  const { showToast } = useToast()

  if (!selectedOrder) {
    return (
      <div className="content-list-data">
        <p>No se encontró el pedido seleccionado.</p>
      </div>
    )
  }

  const handleDownloadPdf = () => {
    downloadOrderPdf(`Pedido ${selectedOrder.id}`, selectedOrder.items, selectedOrder.total, {
      filename: `pedido-${selectedOrder.id}.pdf`,
      subtitle: 'Detalles del pedido',
      metaLines: [
        selectedOrder.invoiceNumber ? `Factura: ${selectedOrder.invoiceNumber}` : '',
        selectedOrder.client?.fullName ? `Cliente: ${selectedOrder.client.fullName}` : '',
        selectedOrder.paymentMethod ? `Pago: ${selectedOrder.paymentMethod}` : '',
      ].filter(Boolean),
    })
    showToast('PDF descargado', 'success')
  }

  const handleVerifyProof = () => {
    const result = verifyTransferProof(selectedOrder.id, { verified: true })
    if (!result?.success) {
      showToast('No se pudo validar el comprobante', 'error')
      return
    }
    if (result.alreadyVerified) {
      showToast('El comprobante ya estaba validado', 'success')
      return
    }
    showToast(
      result.isFullyPaid
        ? 'Comprobante real: pedido pagado al 100%'
        : 'Comprobante real: abono parcial aplicado',
      'success',
    )
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
            onVerifyProof={handleVerifyProof}
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
