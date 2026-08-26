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
import { summarizeCartItems } from '@/shared/lib/money'
import { namedControl } from '@/shared/lib/namedControl'
import { validateAddressLine } from '@/shared/lib/fieldValidation'
import { formatAddressDisplay } from '@/features/auth/utils/mapAboutAddresses'
import { TRANSFER_ACCOUNT } from '@/features/orders/constants/transferAccount'

const MAX_ADDRESSES = 3

export function CartCheckoutDrawerContent() {
  const { cartItems, createOrderFromCheckout } = useCart()
  const { profile, profileSettings, loadProfileFromAboutApi, isLoadingAbout } = useProfile()
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
  const [paymentPanel, setPaymentPanel] = useState(null)
  const [editingDelivery, setEditingDelivery] = useState(false)
  const [editingPayment, setEditingPayment] = useState(false)

  const personal = profileSettings?.personal ?? {}
  const credit = profileSettings?.credit ?? profile?.credit ?? {
    available: 0,
    paymentLimitDays: null,
    hasCredit: false,
  }
  const creditAvailable = Number(credit.available) || 0
  const creditPaymentLimitDays = credit.paymentLimitDays ?? null
  const hasCredit = Boolean(credit.hasCredit) && creditAvailable > 0

  const registeredAddresses = useMemo(() => {
    const fromProfile = (profile?.addresses ?? profileSettings?.addresses ?? [])
      .filter((entry) => entry && String(entry.address ?? '').trim())
      .map((entry, index) => ({
        ...entry,
        id: entry.id ?? `addr-${index + 1}`,
        label: entry.label || `Dirección ${index + 1}`,
        address: String(entry.address).trim(),
        displayLine: formatAddressDisplay(entry) || String(entry.address).trim(),
      }))
    return fromProfile.slice(0, MAX_ADDRESSES)
  }, [profile, profileSettings])

  useEffect(() => {
    if (registeredAddresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(registeredAddresses[0].id)
    }
  }, [registeredAddresses, selectedAddressId])

  useEffect(() => {
    const hasAddresses = (profileSettings?.addresses ?? []).length > 0
    if (!hasAddresses && !isLoadingAbout) {
      loadProfileFromAboutApi()
    }
  }, [profileSettings?.addresses, isLoadingAbout, loadProfileFromAboutApi])

  useEffect(() => {
    if (!hasCredit && paymentPanel === 'credito') {
      setPaymentPanel(null)
    }
    if (!hasCredit && paymentMethod === 'credito') {
      setPaymentMethod(null)
      setPaymentConfirmed(false)
      setPaymentDetails({})
    }
  }, [hasCredit, paymentPanel, paymentMethod])

  const cartTotals = useMemo(() => summarizeCartItems(cartItems), [cartItems])
  const subtotal = cartTotals.subtotal
  const shippingCost = 0
  const iva = cartTotals.iva
  const totalToPay = cartTotals.total + shippingCost

  const hasDelivery = Boolean(deliveryAddress.trim())
  const canConfirmOrder = hasDelivery && paymentConfirmed
  // Visible solo mientras faltan datos o se está editando ese bloque.
  const showDeliverySection = !hasDelivery || editingDelivery
  const showPaymentSection = hasDelivery
    && !editingDelivery
    && (!paymentConfirmed || editingPayment)

  const handleEditDelivery = () => {
    setEditingPayment(false)
    setEditingDelivery(true)
  }

  const handleEditPayment = () => {
    setEditingDelivery(false)
    setEditingPayment(true)
  }

  const confirmRegisteredAddress = () => {
    const selected = registeredAddresses.find((entry) => entry.id === selectedAddressId)
    if (!selected) {
      showToast('Seleccione una dirección registrada', 'error')
      return
    }
    setDeliveryAddress(selected.displayLine || selected.address)
    setEditingDelivery(false)
    showToast('Dirección de entrega establecida', 'success')
  }

  const confirmNewAddress = () => {
    const addressError = validateAddressLine(newAddress, { label: 'La nueva dirección' })
    if (addressError) {
      showToast(addressError, 'error')
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
      account: TRANSFER_ACCOUNT.account,
      bank: TRANSFER_ACCOUNT.bank,
      amount: totalToPay,
      proofName: transferProofName,
      proofDataUrl: transferProofDataUrl,
      proofVerified: false,
    })
    setPaymentPanel(null)
    setEditingPayment(false)
    showToast('Transferencia confirmada', 'success')
  }

  const handleConfirmEfectivo = () => {
    setPaymentMethod('efectivo')
    setPaymentConfirmed(true)
    setPaymentDetails({
      amount: totalToPay,
      amountReceived: totalToPay,
    })
    setPaymentPanel(null)
    setEditingPayment(false)
    showToast('Pago en efectivo seleccionado', 'success')
  }

  const handleConfirmCredit = () => {
    if (!hasCredit) {
      showToast('El usuario no cuenta con crédito disponible', 'error')
      return
    }
    if (totalToPay > creditAvailable) {
      showToast('El pedido supera el cupo de crédito', 'error')
      return
    }
    setPaymentMethod('credito')
    setPaymentConfirmed(true)
    setPaymentDetails({
      availableCredit: creditAvailable,
      paymentLimitDays: creditPaymentLimitDays,
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
    showToast('Pedido creado. Puede seguirlo en Historial.', 'success')
  }

  return (
    <div className="content-main-carrito">
      <div className="content-main-aux-carrito order-payments-panel checkout-panel checkout-finalize">
        <CheckoutOrderSummary
          isOpen
          onToggle={() => {}}
          subtotal={subtotal}
          iva={iva}
          totalToPay={totalToPay}
          hasDelivery={hasDelivery}
          deliveryAddress={deliveryAddress}
          paymentConfirmed={paymentConfirmed}
          paymentMethod={paymentMethod}
          paymentDetails={paymentDetails}
          onEditDelivery={handleEditDelivery}
          onEditPayment={handleEditPayment}
        />

        {showDeliverySection && (
          <CheckoutDeliverySection
            isOpen
            onToggle={() => {}}
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
            isOpen
            onToggle={() => {}}
            totalToPay={totalToPay}
            creditAvailable={creditAvailable}
            creditPaymentLimitDays={creditPaymentLimitDays}
            hasCredit={hasCredit}
            paymentPanel={paymentPanel}
            onSelectPanel={setPaymentPanel}
            paymentMethod={paymentMethod}
            transferProofName={transferProofName}
            onTransferProofChange={handleTransferProofChange}
            onConfirmTransfer={handleConfirmTransfer}
            onConfirmEfectivo={handleConfirmEfectivo}
            onConfirmCredit={handleConfirmCredit}
          />
        )}
      </div>

      <div className="content-main-data-carrito content-main-data-carrito--stack">
        <button
          type="button"
          className="content-main-data-carrito__checkout"
          onClick={handleConfirmOrder}
          disabled={!canConfirmOrder}
          {...namedControl('Confirmar pedido')}
        >
          Confirmar
        </button>
      </div>
    </div>
  )
}
