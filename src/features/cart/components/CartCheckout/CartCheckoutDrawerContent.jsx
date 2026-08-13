import { useEffect, useMemo, useState } from 'react'
import { useCart, useProfile } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { readFileAsDataUrl } from '@/shared/lib/readFileAsDataUrl'
import '@/features/cart/components/CartDrawer/CartDrawer.css'
import '@/features/orders/components/OrderDrawer/OrderDrawer.css'
import './CheckoutFinalizar.css'
import { CheckoutDeliverySection } from './CheckoutDeliverySection'
import { CheckoutPaymentSection } from './CheckoutPaymentSection'
import { CheckoutOrderSummary } from './CheckoutOrderSummary'

const CREDIT_AVAILABLE = 20000000
const MAX_ADDRESSES = 3

export function CartCheckoutDrawerContent() {
  const { cartItems, createOrderFromCheckout } = useCart()
  const { profile, profileSettings } = useProfile()
  const { showToast } = useToast()

  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [mapLocation, setMapLocation] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState({})
  const [transferProofName, setTransferProofName] = useState('')
  const [transferProofDataUrl, setTransferProofDataUrl] = useState('')
  const [contraentregaMethod, setContraentregaMethod] = useState('')
  const [paymentPanel, setPaymentPanel] = useState(null)
  const [editingDelivery, setEditingDelivery] = useState(false)
  const [editingPayment, setEditingPayment] = useState(false)

  const personal = profileSettings?.personal ?? {}

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

  const handleTransferProofChange = async (file) => {
    if (!file) {
      setTransferProofName('')
      setTransferProofDataUrl('')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setTransferProofName(file.name)
      setTransferProofDataUrl(dataUrl || '')
    } catch {
      setTransferProofName('')
      setTransferProofDataUrl('')
      showToast('No se pudo leer el comprobante', 'error')
    }
  }

  const handleConfirmTransfer = () => {
    if (!transferProofName || !transferProofDataUrl) {
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
      proofDataUrl: transferProofDataUrl,
      proofVerified: false,
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

    const phone = personal.phone || personal.mobile || profile?.phone || profile?.mobile || ''
    const profileAddress = [
      personal.address,
      personal.neighborhood,
      personal.city,
      personal.department,
      personal.country,
    ].map((part) => String(part ?? '').trim()).filter(Boolean).join(', ')

    createOrderFromCheckout({
      clientData: {
        fullName: personal.fullName || profile?.fullName || '',
        email: personal.email || profileSettings?.access?.email || profile?.email || '',
        phone,
        mobile: personal.mobile || personal.phone || profile?.mobile || phone,
        documentId: personal.documentId || profile?.documentId || '',
        address: deliveryAddress || profileAddress,
        profileAddress,
        notes: '',
        city: personal.city || '',
        department: personal.department || '',
        mapLocation,
      },
      paymentType: paymentMethod,
      paymentDetails,
    })
    showToast('Pedido creado. Puede seguirlo en la vista de espera.', 'success')
  }

  return (
    <div className="content-main-carrito">
      <div className="content-main-aux-carrito order-payments-panel checkout-panel checkout-finalize">
        <CheckoutOrderSummary
          subtotal={subtotal}
          iva={iva}
          totalToPay={totalToPay}
          hasDelivery={hasDelivery}
          deliveryAddress={deliveryAddress}
          paymentConfirmed={paymentConfirmed}
          paymentMethod={paymentMethod}
          paymentDetails={paymentDetails}
          onEditDelivery={() => setEditingDelivery(true)}
          onEditPayment={() => setEditingPayment(true)}
        />

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
            onTransferProofChange={handleTransferProofChange}
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
