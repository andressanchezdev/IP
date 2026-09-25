import { useMemo, useState } from 'react'
import { useOrders } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { Accordion } from '@/shared/ui/Accordion/Accordion'
import { CurrencyInput } from '@/shared/ui/CurrencyInput/CurrencyInput'
import {
  ABONO_PAYMENT_TYPES,
  PAYMENT_FIELDS,
  validatePaymentDetails,
} from '@/features/orders/constants/paymentConfig'
import {
  ABONO_STATUS_LABEL,
  getCreditRemainingDue,
  getCreditRemainingForNewAbono,
  resolveAbonoStatus,
  sumVerifiedAbonos,
} from '@/features/orders/constants/abonoStatus'
import { TRANSFER_ACCOUNT } from '@/features/orders/constants/transferAccount'
import { formatOrderDateTime, formatRealAmount } from '@/features/orders/utils/orderFormat'
import { readFileAsDataUrl } from '@/shared/lib/readFileAsDataUrl'
import eyeIcon from '@/assets/icons/eye.svg'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import { FieldHint } from '@/shared/ui/FieldHint/FieldHint'
import '@/shared/ui/FieldHint/FieldHint.css'
import '@/features/cart/components/CartDrawer/CartDrawer.css'
import '@/shared/ui/Drawer/Drawer.css'
import '@/features/orders/components/OrderDrawer/OrderDrawer.css'

function resolveInitialAbonoType(orderType) {
  const normalized = String(orderType || '').toLowerCase()
  if (normalized === 'transferencia') {
    return 'transferencia'
  }
  return 'efectivo'
}

function AbonoProofLink({ entry }) {
  if (String(entry?.type || '').toLowerCase() !== 'transferencia') {
    return null
  }
  const details = entry?.details ?? {}
  const url = String(details.proofDataUrl || '').trim()
  const name = String(details.proofName || 'Comprobante').trim() || 'Comprobante'
  if (!url) {
    return <span className="order-payments-panel__quota">Sin comprobante</span>
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

export function OrderPaymentsDrawerContent() {
  const { selectedOrder, formalizeOrderPayment } = useOrders()
  const { showToast } = useToast()
  const [paymentType, setPaymentType] = useState(
    () => resolveInitialAbonoType(selectedOrder?.payment?.type),
  )
  const [formValues, setFormValues] = useState({})

  const payment = selectedOrder?.payment
  const fields = PAYMENT_FIELDS[paymentType] ?? []
  const totalAmount = Number(payment?.amount ?? selectedOrder?.total ?? 0)
  const payments = payment?.payments ?? []
  const paidAmount = sumVerifiedAbonos(payments)
  const remainingDue = getCreditRemainingDue(totalAmount, payments)
  const remainingAmount = getCreditRemainingForNewAbono(totalAmount, payments)

  const validation = useMemo(
    () => validatePaymentDetails(paymentType, formValues, {
      remainingAmount,
      requireTransferProof: paymentType === 'transferencia',
    }),
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

  const handleProofChange = async (file) => {
    if (!file) {
      setFormValues((current) => ({
        ...current,
        proofName: '',
        proofDataUrl: '',
      }))
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setFormValues((current) => ({
        ...current,
        proofName: file.name,
        proofDataUrl: dataUrl || '',
        account: TRANSFER_ACCOUNT.account,
        bank: TRANSFER_ACCOUNT.bank,
      }))
    } catch {
      setFormValues((current) => ({
        ...current,
        proofName: '',
        proofDataUrl: '',
      }))
      showToast('No se pudo leer el comprobante', 'error')
    }
  }

  const handleSubmit = () => {
    if (!validation.isValid) {
      showToast('Complete los datos de pago', 'error')
      return
    }

    const result = formalizeOrderPayment(selectedOrder.id, {
      type: paymentType,
      ...formValues,
      ...(paymentType === 'transferencia'
        ? {
            account: TRANSFER_ACCOUNT.account,
            bank: TRANSFER_ACCOUNT.bank,
          }
        : {}),
    })

    if (!result.success) {
      const message = result.reason === 'exceeds-balance'
        ? `El abono supera el saldo disponible de ${formatRealAmount(result.remainingAmount)}`
        : 'No fue posible registrar el pago'
      showToast(message, 'error')
      return
    }

    showToast('Abono enviado a revisión', 'success')
  }

  const selectedLabel = ABONO_PAYMENT_TYPES.find((entry) => entry.id === paymentType)?.label || ''
  const limitDays = payment?.checkoutDetails?.paymentLimitDays
    ?? payment?.details?.paymentLimitDays
    ?? selectedOrder?.paymentLimitDays

  return (
    <div className="content-main-carrito">
      <div className="content-main-aux-carrito order-payments-panel">
        <p className="order-payments-panel__intro">
          Registre un abono del pedido <strong>{selectedOrder.id}</strong>. Solo efectivo o transferencia.
          El abono queda en revisión hasta que un asesor lo verifique.
          {limitDays != null ? ` Plazo de crédito: ${limitDays} días.` : ''}
        </p>

        <div className="order-payments-panel__summary">
          <span>Saldo pendiente (verificado)</span>
          <strong>{formatRealAmount(remainingDue)}</strong>
          <span className="order-payments-panel__quota">
            Verificado: {formatRealAmount(paidAmount)} de {formatRealAmount(totalAmount)}
          </span>
          <span className="order-payments-panel__quota">
            Disponible para nuevo abono: {formatRealAmount(remainingAmount)}
          </span>
        </div>

        {payments.length > 0 && (
          <Accordion title={`Abonos registrados (${payments.length})`} defaultOpen>
            {payments.map((entry, index) => {
              const status = resolveAbonoStatus(entry)
              const statusLabel = ABONO_STATUS_LABEL[status] || status
              const createdLabel = formatOrderDateTime(entry.createdAt)
              return (
                <div
                  key={entry.id || `${entry.createdAt}-${index}`}
                  className="content-list-data__row content-list-data__row--block"
                >
                  <span className="content-list-data__label">
                    {`${index + 1}. ${entry.type} · ${statusLabel}`}
                    {createdLabel !== '—' ? ` · ${createdLabel}` : ''}
                  </span>
                  <span className="content-list-data__value">
                    {formatRealAmount(entry.amount)}
                  </span>
                  <AbonoProofLink entry={entry} />
                  {status === 'novedad' && entry.noveltyReason ? (
                    <span className="order-payments-panel__quota">
                      Motivo: {entry.noveltyReason}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </Accordion>
        )}

        <div className="order-payment__types order-payments-panel__types">
          {ABONO_PAYMENT_TYPES.map(({ id, label }) => {
            const isSelected = paymentType === id
            return (
              <button
                key={id}
                type="button"
                title={isSelected ? label : undefined}
                aria-pressed={isSelected}
                className={`order-payment__type order-payment__type--selectable ${isSelected ? 'order-payment__type--active' : ''}`}
                onClick={() => {
                  setPaymentType(id)
                  setFormValues({})
                }}
                {...namedControl(label)}
              >
                {label}
              </button>
            )
          })}
        </div>

        <Accordion title={`Datos — ${selectedLabel}`} defaultOpen>
          {paymentType === 'transferencia' && (
            <>
              <div className="content-list-data__row">
                <span className="content-list-data__label">{TRANSFER_ACCOUNT.accountLabel}</span>
                <span className="content-list-data__value">{TRANSFER_ACCOUNT.account}</span>
              </div>
              <div className="content-list-data__row">
                <span className="content-list-data__label">{TRANSFER_ACCOUNT.bankLabel}</span>
                <span className="content-list-data__value">{TRANSFER_ACCOUNT.bank}</span>
              </div>
            </>
          )}

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
                    {...namedControl(field.label)}
                  />
                )}
                <FieldHint id={`${inputId}-error`} message={fieldError} />
              </label>
            )
          })}

          {paymentType === 'transferencia' && (
            <label className="order-payments-panel__field">
              <span>Comprobante de pago</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  handleProofChange(file)
                }}
                className={validation.errors.proof ? 'order-payments-panel__input--error' : ''}
                aria-invalid={Boolean(validation.errors.proof)}
                {...namedControl('Comprobante de pago')}
              />
              {formValues.proofName ? (
                <span className="order-payments-panel__quota">Archivo: {formValues.proofName}</span>
              ) : null}
              <FieldHint message={validation.errors.proof || ''} />
            </label>
          )}
        </Accordion>
      </div>

      <div className="content-main-data-carrito">
        <div className="content-main-data-carrito__total">
          <span>Disponible para abono</span>
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
