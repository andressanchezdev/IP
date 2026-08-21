const MISSING_LIMIT_MESSAGE = 'Valor no obtenido'

const DAY_FIELD_KEYS = [
  'dias_limite',
  'dias_pago',
  'limite_dias',
  'limite_pago_dias',
  'payment_limit_days',
  'paymentLimitDays',
  'plazo_dias',
  'credito_dias',
  'dias_credito',
]

function toSafeDate(value) {
  if (!value) {
    return null
  }
  const normalized = String(value).includes('T')
    ? String(value)
    : String(value).replace(' ', 'T')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function pickPaymentLimitDays(source = {}) {
  if (source == null || typeof source !== 'object') {
    return null
  }

  for (const key of DAY_FIELD_KEYS) {
    if (source[key] == null || source[key] === '') {
      continue
    }
    const days = Number(source[key])
    if (Number.isFinite(days) && days > 0) {
      return Math.floor(days)
    }
  }

  return null
}

/**
 * Extrae días de límite desde la venta API o detalles de checkout.
 */
export function resolvePaymentLimitDays(entry = {}, extras = {}) {
  const fromEntry = pickPaymentLimitDays(entry)
  if (fromEntry != null) {
    return fromEntry
  }

  const nested = [
    entry?.pago,
    entry?.credito,
    entry?.detalle,
    entry?.meta,
    extras?.checkoutDetails,
    extras?.details,
    extras?.paymentDetails,
  ]

  for (const candidate of nested) {
    const days = pickPaymentLimitDays(candidate)
    if (days != null) {
      return days
    }
  }

  return null
}

/**
 * fecha creación + N días → fecha límite.
 * Sin días → mensaje claro para el usuario.
 */
export function resolvePaymentDeadline({
  createdAt,
  paymentLimitDays,
  format = 'display',
} = {}) {
  const days = Number(paymentLimitDays)
  if (!Number.isFinite(days) || days <= 0) {
    return {
      days: null,
      deadlineIso: null,
      dateLimitLabel: MISSING_LIMIT_MESSAGE,
      hasLimit: false,
    }
  }

  const base = toSafeDate(createdAt) || new Date()
  const deadline = new Date(base.getTime())
  deadline.setDate(deadline.getDate() + Math.floor(days))

  const yyyy = deadline.getFullYear()
  const mm = String(deadline.getMonth() + 1).padStart(2, '0')
  const dd = String(deadline.getDate()).padStart(2, '0')

  return {
    days: Math.floor(days),
    deadlineIso: deadline.toISOString(),
    dateLimitLabel: format === 'iso'
      ? deadline.toISOString()
      : `${yyyy}/${mm}/${dd}`,
    hasLimit: true,
  }
}

export const PAYMENT_LIMIT_MISSING_MESSAGE = MISSING_LIMIT_MESSAGE
