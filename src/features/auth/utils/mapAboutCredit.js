/**
 * Extrae crédito desde GET /api/v1/managment/users/about → data.credito.
 * Forma actual: { cupo, resta, dias }.
 * - resta → disponible (available)
 * - cupo → cupo total (limit)
 * - dias → paymentLimitDays
 */

function toAmount(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function toPositiveDays(value) {
  const days = Number(value)
  if (!Number.isFinite(days) || days <= 0) {
    return null
  }
  return Math.floor(days)
}

function pickFirstAmount(source, keys) {
  for (const key of keys) {
    if (source[key] != null && source[key] !== '') {
      return toAmount(source[key])
    }
  }
  return 0
}

/** Disponible para comprar a crédito (prioridad: resta). */
const AVAILABLE_KEYS = [
  'resta',
  'disponible',
  'valor',
  'monto',
  'amount',
  'saldo',
  'disponible_credito',
  'cupo',
  'credito',
]

/** Cupo total del cliente. */
const LIMIT_KEYS = [
  'cupo',
  'cupo_total',
  'limite',
  'limit',
]

const DAYS_KEYS = [
  'dias',
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

/**
 * @returns {{
 *   available: number,
 *   limit: number,
 *   paymentLimitDays: number|null,
 *   hasCredit: boolean,
 *   raw: unknown
 * }}
 */
export function mapAboutCredit(creditoField) {
  if (creditoField == null || creditoField === '') {
    return {
      available: 0,
      limit: 0,
      paymentLimitDays: null,
      hasCredit: false,
      raw: creditoField,
    }
  }

  if (typeof creditoField === 'number' || typeof creditoField === 'string') {
    const available = toAmount(creditoField)
    return {
      available,
      limit: available,
      paymentLimitDays: null,
      hasCredit: available > 0,
      raw: creditoField,
    }
  }

  if (typeof creditoField !== 'object' || Array.isArray(creditoField)) {
    return {
      available: 0,
      limit: 0,
      paymentLimitDays: null,
      hasCredit: false,
      raw: creditoField,
    }
  }

  const available = pickFirstAmount(creditoField, AVAILABLE_KEYS)
  const limit = pickFirstAmount(creditoField, LIMIT_KEYS) || available

  let paymentLimitDays = null
  for (const key of DAYS_KEYS) {
    if (creditoField[key] != null && creditoField[key] !== '') {
      paymentLimitDays = toPositiveDays(creditoField[key])
      if (paymentLimitDays != null) {
        break
      }
    }
  }

  return {
    available,
    limit,
    paymentLimitDays,
    hasCredit: available > 0,
    raw: creditoField,
  }
}
