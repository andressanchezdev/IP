import { PAYMENT_METHOD_LABELS } from '@/features/orders/constants/paymentConfig'

/**
 * Normaliza el medio elegido en Finalizar a efectivo | transferencia | credito
 * (contraentrega se reduce al método real: efectivo o transferencia).
 */
export function resolveCheckoutPaymentType(paymentType, paymentDetails = {}) {
  const raw = String(paymentType ?? '').trim().toLowerCase()

  if (raw === 'credito') {
    return 'credito'
  }
  if (raw === 'transferencia') {
    return 'transferencia'
  }
  if (raw === 'efectivo') {
    return 'efectivo'
  }
  if (raw === 'contraentrega') {
    const nested = String(paymentDetails?.method ?? '').trim().toLowerCase()
    return nested === 'transferencia' ? 'transferencia' : 'efectivo'
  }

  return 'efectivo'
}

export function paymentTypeLabel(type) {
  return PAYMENT_METHOD_LABELS[type] ?? 'Efectivo'
}
