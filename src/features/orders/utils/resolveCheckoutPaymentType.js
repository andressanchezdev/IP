import { PAYMENT_METHOD_LABELS } from '@/features/orders/constants/paymentConfig'

/** Normaliza el medio elegido en Finalizar a efectivo | transferencia | credito. */
export function resolveCheckoutPaymentType(paymentType) {
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

  return 'efectivo'
}

export function paymentTypeLabel(type) {
  return PAYMENT_METHOD_LABELS[type] ?? 'Efectivo'
}
