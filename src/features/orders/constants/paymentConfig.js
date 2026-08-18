export const PAYMENT_METHOD_LABELS = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  credito: 'Crédito',
}

export const PAYMENT_TYPES = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'credito', label: 'Crédito' },
]

export const PAYMENT_FIELDS = {
  efectivo: [
    { key: 'amountReceived', label: 'Monto recibido', type: 'number', placeholder: '0', required: true },
    { key: 'notes', label: 'Observaciones', type: 'text', placeholder: 'Opcional', required: false },
  ],
  transferencia: [
    { key: 'reference', label: 'Referencia / comprobante', type: 'text', placeholder: 'Número de transferencia', required: true },
    { key: 'bank', label: 'Banco', type: 'text', placeholder: 'Entidad bancaria', required: true },
    { key: 'amount', label: 'Monto transferido', type: 'number', placeholder: '0', required: true },
  ],
  credito: [
    { key: 'amount', label: 'Monto abonado', type: 'number', placeholder: '0', required: true },
    { key: 'installments', label: 'Cuotas', type: 'number', placeholder: '1', required: true },
    { key: 'creditNotes', label: 'Notas de crédito', type: 'text', placeholder: 'Condiciones acordadas', required: true },
  ],
}

export function validatePaymentDetails(paymentType, formValues, options = {}) {
  const fields = PAYMENT_FIELDS[paymentType] ?? []
  const errors = {}
  const remainingAmount = options.remainingAmount

  fields.forEach((field) => {
    if (!field.required) {
      return
    }
    const value = formValues[field.key]
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
      if (Number.isFinite(remainingAmount) && ['amount', 'amountReceived'].includes(field.key) && amount > remainingAmount) {
        errors[field.key] = `${field.label} supera el saldo pendiente`
      }
    }
  })

  return { isValid: Object.keys(errors).length === 0, errors }
}
