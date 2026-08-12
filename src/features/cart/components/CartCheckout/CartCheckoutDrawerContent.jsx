import { useEffect, useMemo, useState } from 'react'
import { useCart, useProfile } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { Accordion } from '@/shared/ui/Accordion/Accordion'
import { formatPrice } from '@/shared/lib/formatPrice'
import editIcon from '@/assets/icons/edit.svg'
import '@/features/cart/components/CartDrawer/CartDrawer.css'
import '@/features/orders/components/OrderDrawer/OrderDrawer.css'
import './CheckoutFinalizar.css'
import { SummaryRow } from './SummaryRow'
import { CheckoutDeliverySection } from './CheckoutDeliverySection'
import { CheckoutPaymentSection } from './CheckoutPaymentSection'

const CREDIT_AVAILABLE = 20000000
const MAX_ADDRESSES = 3

export function CartCheckoutDrawerContent() {
  const { cartItems, createOrderFromCheckout } = useCart()
  const { profile } = useProfile()
  const { showToast } = useToast()

  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [mapLocation, setMapLocation] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState({})
  const [transferProofName, setTransferProofName] = useState('')
  const [contraentregaMethod, setContraentregaMethod] = useState('')
  const [paymentPanel, setPaymentPanel] = useState(null)
  const [editingDelivery, setEditingDelivery] = useState(false)
  const [editingPayment, setEditingPayment] = useState(false)

  const registeredAddresses = useMemo(() => {
    const fromProfile = profile?.addresses ?? []
    return fromProfile.slice(0, MAX_ADDRESSES)
  }, [profile])

  useEffect(() => {
    if (registeredAddresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(registeredAddresses[0].id)
    }
  }, [registeredAddresses, selectedAddressId])

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  )
  const shippingCost = 0
  const iva = Math.round(subtotal * 0.19)
  const totalToPay = subtotal + shippingCost + iva

  const hasDelivery = Boolean(deliveryAddress.trim())
  const showDeliverySection = !hasDelivery || editingDelivery
  const showPaymentSection = !paymentConfirmed || editingPayment
  const canConfirmOrder = hasDelivery && paymentConfirmed

  const confirmRegisteredAddress = () => {
    const selected = registeredAddresses.find((entry) => entry.id === selectedAddressId)
    if (!selected) {
      showToast('Seleccione una dirección registrada', 'error')
      return
    }
    setDeliveryAddress(selected.address)
    setEditingDelivery(false)
    showToast('Dirección de entrega establecida', 'success')
  }

  const confirmNewAddress = () => {
    if (!newAddress.trim()) {
      showToast('Ingrese la nueva dirección', 'error')
      return
    }
    if (registeredAddresses.length >= MAX_ADDRESSES) {
      showToast('Máximo 3 direcciones por usuario', 'error')
    }
    setDeliveryAddress(newAddress.trim())
    setEditingDelivery(false)
    showToast('Nueva dirección establecida', 'success')
  }

  const confirmMapAddress = () => {
    if (!mapLocation?.address) {
      showToast('Seleccione un punto en el mapa', 'error')
      return
    }
    setDeliveryAddress(mapLocation.address)
    setEditingDelivery(false)
    showToast('Ubicación de mapa establecida', 'success')
  }

  const handleConfirmTransfer = () => {
    if (!transferProofName) {
      showToast('Suba el comprobante de transferencia', 'error')
      return
    }
    setPaymentMethod('transferencia')
    setPaymentConfirmed(true)
    setPaymentDetails({
      account: '01400000369',
      bank: 'Bancolombia',
      amount: totalToPay,
      proofName: transferProofName,
    })
    setPaymentPanel(null)
    setEditingPayment(false)
    showToast('Transferencia confirmada', 'success')
  }

  const handleConfirmContraentrega = () => {
    if (!contraentregaMethod) {
      showToast('Elija transferencia o efectivo', 'error')
      return
    }
    setPaymentMethod('contraentrega')
    setPaymentConfirmed(true)
    setPaymentDetails({
      method: contraentregaMethod,
      amount: totalToPay,
    })
    setPaymentPanel(null)
    setEditingPayment(false)
    showToast('Contra entrega confirmada', 'success')
  }

  const handleConfirmCredit = () => {
    if (totalToPay > CREDIT_AVAILABLE) {
      showToast('El pedido supera el cupo de crédito', 'error')
      return
    }
    setPaymentMethod('credito')
    setPaymentConfirmed(true)
    setPaymentDetails({
      availableCredit: CREDIT_AVAILABLE,
      paymentLimitMonths: 2,
      amount: totalToPay,
    })
    setPaymentPanel(null)
    setEditingPayment(false)
    showToast('Crédito seleccionado', 'success')
  }

  const handleConfirmOrder = () => {
    if (!canConfirmOrder) {
      return
    }

    createOrderFromCheckout({
      clientData: {
        fullName: profile?.fullName || '',
        address: deliveryAddress,
        notes: '',
      },
      paymentType: paymentMethod,
      paymentDetails,
    })
    showToast('Pedido creado. Puede seguirlo en la vista de espera.', 'success')
  }

  return (
    <div className="content-main-carrito">
      <div className="content-main-aux-carrito order-payments-panel checkout-panel checkout-finalize">
        <Accordion title="Información del pedido" defaultOpen>
          <div className="checkout-finalize__box">
            <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
            <SummaryRow label="Costo de envío" value="Gratis" />
            <SummaryRow label="IVA (19%)" value={formatPrice(iva)} />
            <SummaryRow label="Total a pagar" value={formatPrice(totalToPay)} highlight />
            {hasDelivery && (
              <div className="checkout-finalize__delivery-note">
                <div className="checkout-finalize__field-head">
                  <span>Entrega</span>
                  <button
                    type="button"
                    className="checkout-finalize__edit"
                    aria-label="Editar entrega"
                    onClick={() => setEditingDelivery(true)}
                  >
                    <img src={editIcon} alt="" width={16} height={16} />
                  </button>
                </div>
                <strong>{deliveryAddress}</strong>
              </div>
            )}
            {paymentConfirmed && (
              <div className="checkout-finalize__delivery-note">
                <div className="checkout-finalize__field-head">
                  <span>Pago</span>
                  <button
                    type="button"
                    className="checkout-finalize__edit"
                    aria-label="Editar método de pago"
                    onClick={() => setEditingPayment(true)}
                  >
                    <img src={editIcon} alt="" width={16} height={16} />
                  </button>
                </div>
                <strong>
                  {paymentMethod === 'transferencia' && 'Transferencia'}
                  {paymentMethod === 'contraentrega' && `Contra entrega (${paymentDetails.method})`}
                  {paymentMethod === 'credito' && 'Crédito'}
                </strong>
              </div>
            )}
          </div>
        </Accordion>

        {showDeliverySection && (
          <CheckoutDeliverySection
            registeredAddresses={registeredAddresses}
            selectedAddressId={selectedAddressId}
            onSelectAddress={setSelectedAddressId}
            newAddress={newAddress}
            onNewAddressChange={setNewAddress}
            mapLocation={mapLocation}
            onMapLocationChange={setMapLocation}
            onConfirmRegistered={confirmRegisteredAddress}
            onConfirmNew={confirmNewAddress}
            onConfirmMap={confirmMapAddress}
          />
        )}

        {showPaymentSection && (
          <CheckoutPaymentSection
            totalToPay={totalToPay}
            creditAvailable={CREDIT_AVAILABLE}
            paymentPanel={paymentPanel}
            onSelectPanel={setPaymentPanel}
            paymentMethod={paymentMethod}
            transferProofName={transferProofName}
            onTransferProofChange={setTransferProofName}
            contraentregaMethod={contraentregaMethod}
            onContraentregaMethodChange={setContraentregaMethod}
            onConfirmTransfer={handleConfirmTransfer}
            onConfirmContraentrega={handleConfirmContraentrega}
            onConfirmCredit={handleConfirmCredit}
          />
        )}

        <button
          type="button"
          className="content-main-data-carrito__checkout checkout-finalize__confirm"
          onClick={handleConfirmOrder}
          disabled={!canConfirmOrder}
        >
          Confirmar
        </button>
      </div>
    </div>
  )
}
