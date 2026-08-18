import { useMemo, useState } from 'react'
import { useOrders } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { Accordion } from '@/shared/ui/Accordion/Accordion'
import { CurrencyInput } from '@/shared/ui/CurrencyInput/CurrencyInput'
import {
  PAYMENT_FIELDS,
  PAYMENT_TYPES,
  validatePaymentDetails,
} from '@/features/orders/constants/paymentConfig'
import { formatRealAmount } from '@/features/orders/utils/orderFormat'
import { namedControl } from '@/shared/lib/namedControl'
import { FieldHint } from '@/shared/ui/FieldHint/FieldHint'
import '@/shared/ui/FieldHint/FieldHint.css'
import '@/features/cart/components/CartDrawer/CartDrawer.css'
import '@/shared/ui/Drawer/Drawer.css'
import '@/features/orders/components/OrderDrawer/OrderDrawer.css'

export function OrderPaymentsDrawerContent() {
  const { selectedOrder, formalizeOrderPayment } = useOrders()
  const { showToast } = useToast()
  const [paymentType, setPaymentType] = useState(selectedOrder?.payment?.type ?? 'efectivo')
  const [formValues, setFormValues] = useState({})

  const payment = selectedOrder?.payment
  const fields = PAYMENT_FIELDS[paymentType] ?? []
  const totalAmount = Number(payment?.amount ?? selectedOrder?.total ?? 0)
  const paidAmount = Number(payment?.paidAmount ?? 0)
  const remainingAmount = Math.max(0, totalAmount - paidAmount)
  const payments = payment?.payments ?? []

  const validation = useMemo(
    () => validatePaymentDetails(paymentType, formValues, { remainingAmount }),
    [paymentType, formValues, remainingAmount],
  )

  if (!selectedOrder) {
    return (
      <div className="content-main-carrito">
        <p className="content-main-carrito__empty">No se encontró el pedido.</p>
      </div>
    )
  }

  const handleFieldChange = (key, value) => {
    setFormValues((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = () => {
    if (!validation.isValid) {
      showToast('Complete los datos de pago', 'error')
      return
    }

    const result = formalizeOrderPayment(selectedOrder.id, {
      type: paymentType,
      ...formValues,
    })

    if (!result.success) {
      const message = result.reason === 'exceeds-balance'
        ? `El abono supera el saldo pendiente de ${formatRealAmount(result.remainingAmount)}`
        : 'No fue posible registrar el pago'
      showToast(message, 'error')
      return
    }

    showToast(
      result.isFullyPaid ? 'Pedido pagado y enviado al historial' : 'Abono registrado',
      'success',
    )
  }

  const checkoutDetails = payment.checkoutDetails ?? {}
  const hasCheckoutDetails = Object.keys(checkoutDetails).length > 0
  const checkoutFields = PAYMENT_FIELDS[payment.type] ?? []

  const getDetailLabel = (key) =>
    checkoutFields.find((field) => field.key === key)?.label ?? key

  return (
    <div className="content-main-carrito">
      <div className="content-main-aux-carrito order-payments-panel">
        <p className="order-payments-panel__intro">
          Formalice el pago del pedido <strong>{selectedOrder.id}</strong>. Seleccione el medio y complete los datos.
        </p>

        <div className="order-payments-panel__summary">
          <span>Monto pendiente</span>
          <strong>{formatRealAmount(remainingAmount)}</strong>
          <span className="order-payments-panel__quota">
            Abonado: {formatRealAmount(paidAmount)} de {formatRealAmount(totalAmount)}
          </span>
        </div>

        {hasCheckoutDetails && (
          <Accordion title="Datos definidos al crear el pedido">
            {Object.entries(checkoutDetails).map(([key, value]) => (
              <div key={key} className="content-list-data__row">
                <span className="content-list-data__label">{getDetailLabel(key)}</span>
                <span className="content-list-data__value">{String(value)}</span>
              </div>
            ))}
          </Accordion>
        )}

        {payments.length > 0 && (
          <Accordion title={`Abonos registrados (${payments.length})`} defaultOpen>
            {payments.map((entry, index) => (
              <div key={`${entry.createdAt}-${index}`} className="content-list-data__row">
                <span className="content-list-data__label">
                  {`${index + 1}. ${entry.type}`}
                </span>
                <span className="content-list-data__value">
                  {formatRealAmount(entry.amount)}
                </span>
              </div>
            ))}
          </Accordion>
        )}

        <div className="order-payment__types order-payments-panel__types">
          {PAYMENT_TYPES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`order-payment__type order-payment__type--selectable ${paymentType === id ? 'order-payment__type--active' : ''}`}
              onClick={() => {
                setPaymentType(id)
                setFormValues({})
              }}
              {...namedControl(label)}
            >
              {label}
            </button>
          ))}
        </div>

        <Accordion title={`Datos — ${PAYMENT_TYPES.find((t) => t.id === paymentType)?.label}`} defaultOpen>
          {fields.map((field) => {
            const fieldError = validation.errors[field.key] ?? ''
            const inputId = `payment-${field.key}`

            return (
              <label key={field.key} className="order-payments-panel__field">
                <span>{field.label}</span>
                {['amount', 'amountReceived'].includes(field.key) ? (
                  <CurrencyInput
                    id={inputId}
                    value={formValues[field.key] ?? ''}
                    onChange={(nextValue) => handleFieldChange(field.key, nextValue)}
                    placeholder={field.placeholder}
                    max={remainingAmount}
                    invalid={Boolean(fieldError)}
                    className={fieldError ? 'order-payments-panel__input--error' : ''}
                  />
                ) : (
                  <input
                    id={inputId}
                    type={field.type}
                    value={formValues[field.key] ?? ''}
                    onChange={(event) => handleFieldChange(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className={fieldError ? 'order-payments-panel__input--error' : ''}
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={fieldError ? `${inputId}-error` : undefined}
                    {...namedControl(field.label)}
                  />
                )}
                <FieldHint id={`${inputId}-error`} message={fieldError} />
              </label>
            )
          })}
        </Accordion>
      </div>

      <div className="content-main-data-carrito">
        <div className="content-main-data-carrito__total">
          <span>Saldo pendiente</span>
          <strong>{formatRealAmount(remainingAmount)}</strong>
        </div>
        <button
          type="button"
          className="content-main-data-carrito__checkout"
          onClick={handleSubmit}
          disabled={remainingAmount === 0 || !validation.isValid}
          {...namedControl('Formalizar pago')}
        >
          Formalizar pago
        </button>
      </div>
    </div>
  )
}
