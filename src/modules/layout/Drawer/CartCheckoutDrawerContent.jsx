import { useContext, useEffect, useMemo, useState } from 'react'
import { AppContext } from '../../../context/AppContext'
import { useToast } from '../../../context/ToastContext'
import { Accordion } from '../../ui/Accordion/Accordion'
import { formatPrice } from '../../../utils/formatPrice'
import { mockProfile } from '../../../features/landing/data/mockProfile'
import editIcon from '../../../assets/icons/edit.svg'
import './CartDrawer.css'
import './OrderDrawer.css'
import './CheckoutFinalizar.css'

const CREDIT_AVAILABLE = 20000000
const MAX_ADDRESSES = 3
const MAP_ADDRESS_PLACEHOLDER = 'Ubicación seleccionada en mapa — Bogotá, Colombia'

function buildClientDefaults(profileSettings) {
  const { personal, company } = profileSettings
  return {
    fullName: personal.fullName ?? '',
    documentId: personal.documentId ?? '',
    phone: personal.phone ?? '',
    email: personal.email ?? '',
    address: company.address ?? '',
    notes: '',
  }
}

function SummaryRow({ label, value, highlight = false }) {
  return (
    <div className={`checkout-finalize__row ${highlight ? 'checkout-finalize__row--highlight' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function CartCheckoutDrawerContent() {
  const { cartItems, profileSettings, createOrderFromCheckout, profile } = useContext(AppContext)
  const { showToast } = useToast()

  const [deliverySource, setDeliverySource] = useState(null)
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState({})
  const [transferProofName, setTransferProofName] = useState('')
  const [contraentregaMethod, setContraentregaMethod] = useState('')
  const [paymentPanel, setPaymentPanel] = useState(null)
  const [editingDelivery, setEditingDelivery] = useState(false)
  const [editingPayment, setEditingPayment] = useState(false)

  const registeredAddresses = useMemo(() => {
    const fromProfile = profile?.addresses ?? mockProfile.addresses ?? []
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
  const canCreateOrder = hasDelivery && paymentConfirmed && cartItems.length > 0

  const clientData = useMemo(() => {
    const defaults = buildClientDefaults(profileSettings)
    return {
      ...defaults,
      address: deliveryAddress || defaults.address,
      notes: deliverySource === 'map' ? 'Entrega según ubicación en mapa' : defaults.notes,
    }
  }, [profileSettings, deliveryAddress, deliverySource])

  const confirmRegisteredAddress = () => {
    const selected = registeredAddresses.find((entry) => entry.id === selectedAddressId)
    if (!selected) {
      showToast('Seleccione una dirección registrada', 'error')
      return
    }
    setDeliverySource('registered')
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
    setDeliverySource('new')
    setDeliveryAddress(newAddress.trim())
    setEditingDelivery(false)
    showToast('Nueva dirección establecida', 'success')
  }

  const confirmMapAddress = () => {
    setDeliverySource('map')
    setDeliveryAddress(MAP_ADDRESS_PLACEHOLDER)
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

  const handlePlaceOrder = () => {
    if (!canCreateOrder) {
      showToast('Complete entrega y método de pago', 'error')
      return
    }

    createOrderFromCheckout({
      clientData,
      paymentType: paymentMethod === 'contraentrega' ? 'efectivo' : paymentMethod,
      paymentDetails: {
        ...paymentDetails,
        deliverySource,
        deliveryAddress,
        checkoutFlow: 'finalizar',
      },
    })
    showToast('Pedido realizado correctamente', 'success')
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
          <Accordion title="Entrega" defaultOpen>
            <div className="checkout-finalize__box">
              <Accordion title="1. Direcciones registradas" defaultOpen>
                <div className="checkout-finalize__options">
                  {registeredAddresses.map((entry) => (
                    <label key={entry.id} className="checkout-finalize__option">
                      <input
                        type="radio"
                        name="registered-address"
                        checked={selectedAddressId === entry.id}
                        onChange={() => setSelectedAddressId(entry.id)}
                      />
                      <span>
                        <strong>{entry.label}</strong>
                        <small>{entry.address}</small>
                      </span>
                    </label>
                  ))}
                  <button
                    type="button"
                    className="content-main-data-carrito__checkout"
                    onClick={confirmRegisteredAddress}
                    disabled={registeredAddresses.length === 0}
                  >
                    Establecer dirección
                  </button>
                </div>
              </Accordion>

              <Accordion title="2. Agregar una nueva dirección de entrega">
                <label className="order-payments-panel__field">
                  <span>Nueva dirección</span>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(event) => setNewAddress(event.target.value)}
                    placeholder="Calle, número, ciudad"
                  />
                </label>
                <button
                  type="button"
                  className="content-main-data-carrito__checkout"
                  onClick={confirmNewAddress}
                >
                  Establecer dirección
                </button>
              </Accordion>

              <Accordion title="3. Elegir dirección de entrega en el mapa">
                <p className="order-payments-panel__intro">
                  Seleccione la ubicación de entrega en el mapa. Se usará la posición confirmada para el despacho.
                </p>
                <div className="checkout-finalize__map-slot" aria-hidden="true">
                  Mapa de entrega
                </div>
                <button
                  type="button"
                  className="content-main-data-carrito__checkout"
                  onClick={confirmMapAddress}
                >
                  Confirmar ubicación
                </button>
              </Accordion>
            </div>
          </Accordion>
        )}

        {showPaymentSection && (
          <Accordion title="Método de pago" defaultOpen>
            <div className="checkout-finalize__box">
              <div className="order-payment__types order-payments-panel__types">
                {[
                  { id: 'transferencia', label: 'Transferencia' },
                  { id: 'contraentrega', label: 'Contra entrega' },
                  { id: 'credito', label: 'Crédito' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    className={`order-payment__type order-payment__type--selectable ${paymentPanel === id || paymentMethod === id ? 'order-payment__type--active' : ''}`}
                    onClick={() => setPaymentPanel(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {paymentPanel === 'transferencia' && (
                <div className="checkout-finalize__payment-panel">
                  <SummaryRow label="Cuenta ahorros" value="01400000369" />
                  <SummaryRow label="Valor total a transferir" value={formatPrice(totalToPay)} highlight />
                  <SummaryRow label="Entidad bancaria" value="Bancolombia" />
                  <label className="order-payments-panel__field">
                    <span>Comprobante de transferencia</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        setTransferProofName(file ? file.name : '')
                      }}
                    />
                    {transferProofName && (
                      <span className="order-payments-panel__quota">Archivo: {transferProofName}</span>
                    )}
                  </label>
                  <button
                    type="button"
                    className="content-main-data-carrito__checkout"
                    onClick={handleConfirmTransfer}
                    disabled={!transferProofName}
                  >
                    Seleccionar
                  </button>
                </div>
              )}

              {paymentPanel === 'contraentrega' && (
                <div className="checkout-finalize__payment-panel">
                  <SummaryRow label="Valor del pedido" value={formatPrice(totalToPay)} highlight />
                  <span className="checkout-finalize__box-title">Método de pago en entrega</span>
                  <label className="filter-drawer-check">
                    <input
                      type="checkbox"
                      checked={contraentregaMethod === 'transferencia'}
                      onChange={() => setContraentregaMethod('transferencia')}
                    />
                    <span>Transferencia</span>
                  </label>
                  <label className="filter-drawer-check">
                    <input
                      type="checkbox"
                      checked={contraentregaMethod === 'efectivo'}
                      onChange={() => setContraentregaMethod('efectivo')}
                    />
                    <span>Efectivo</span>
                  </label>
                  <button
                    type="button"
                    className="content-main-data-carrito__checkout"
                    onClick={handleConfirmContraentrega}
                    disabled={!contraentregaMethod}
                  >
                    Seleccionar
                  </button>
                </div>
              )}

              {paymentPanel === 'credito' && (
                <div className="checkout-finalize__payment-panel">
                  <SummaryRow label="Total del pedido" value={formatPrice(totalToPay)} highlight />
                  <SummaryRow label="Crédito disponible" value={formatPrice(CREDIT_AVAILABLE)} />
                  <SummaryRow label="Límite de pago" value="2 meses desde la creación" />
                  <button
                    type="button"
                    className="content-main-data-carrito__checkout"
                    onClick={handleConfirmCredit}
                  >
                    Seleccionar
                  </button>
                </div>
              )}
            </div>
          </Accordion>
        )}
      </div>

      <div className="content-main-data-carrito">
        <div className="content-main-data-carrito__total">
          <span>Total a pagar</span>
          <strong>{formatPrice(totalToPay)}</strong>
        </div>
        <button
          type="button"
          className="content-main-data-carrito__checkout"
          onClick={handlePlaceOrder}
          disabled={!canCreateOrder}
        >
          Crear pedido
        </button>
      </div>
    </div>
  )
}
