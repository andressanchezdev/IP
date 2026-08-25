import {
  validateBoundedText,
  validateReason,
} from '@/shared/lib/fieldValidation'

export const PAYMENT_METHOD_LABELS = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  credito: 'Crédito',
}

/** Medios al crear pedido (Finalizar). */
export const CHECKOUT_PAYMENT_TYPES = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'credito', label: 'Crédito' },
]

/**
 * Medios al registrar abono: solo efectivo / transferencia.
 * (El crédito del pedido se eligió en Finalizar; aquí solo se abona.)
 */
export const ABONO_PAYMENT_TYPES = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
]

/** @deprecated Usar CHECKOUT_PAYMENT_TYPES o ABONO_PAYMENT_TYPES */
export const PAYMENT_TYPES = CHECKOUT_PAYMENT_TYPES

export const PAYMENT_FIELDS = {
  efectivo: [
    { key: 'amountReceived', label: 'Monto recibido', type: 'number', placeholder: '0', required: true },
  ],
  transferencia: [
    { key: 'amount', label: 'Monto transferido', type: 'number', placeholder: '0', required: true },
  ],
  credito: [
    { key: 'amount', label: 'Monto abonado', type: 'number', placeholder: '0', required: true },
    { key: 'installments', label: 'Cuotas', type: 'number', placeholder: '1', required: true },
    { key: 'creditNotes', label: 'Notas de crédito', type: 'text', placeholder: 'Condiciones acordadas', required: true },
  ],
}

const TEXT_FIELD_KEYS = new Set(['notes', 'reference', 'bank', 'creditNotes'])

export function validatePaymentDetails(paymentType, formValues, options = {}) {
  const fields = PAYMENT_FIELDS[paymentType] ?? []
  const errors = {}
  const remainingAmount = options.remainingAmount
  const requireTransferProof = options.requireTransferProof === true

  fields.forEach((field) => {
    const value = formValues[field.key]

    if (TEXT_FIELD_KEYS.has(field.key)) {
      const textError = field.required
        ? validateBoundedText(value, { required: true, label: field.label })
        : validateReason(value, { required: false, label: field.label })
      if (textError) {
        errors[field.key] = textError
      }
      return
    }

    if (!field.required) {
      return
    }

    if (value === undefined || value === null || String(value).trim() === '') {
      errors[field.key] = `${field.label} es obligatorio`
      return
    }

    if (field.type === 'number') {
      const amount = Number(value)
      if (!Number.isFinite(amount) || amount <= 0) {
        errors[field.key] = `${field.label} debe ser mayor que cero`
        return
      }
      if (
        Number.isFinite(remainingAmount)
        && ['amount', 'amountReceived'].includes(field.key)
        && amount > remainingAmount
      ) {
        errors[field.key] = `${field.label} supera el saldo pendiente`
      }
    }
  })

  if (paymentType === 'transferencia' && requireTransferProof) {
    if (!String(formValues.proofName ?? '').trim() || !String(formValues.proofDataUrl ?? '').trim()) {
      errors.proof = 'Suba el comprobante de transferencia'
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors }
}
