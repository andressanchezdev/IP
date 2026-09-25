import {
  isProductTaxExempt,
  readProductIvaRate,
} from '@/features/catalog/lib/productFiscalFields'

/** IVA incluido en el bruto: neto = bruto / (1 + tasa/100) = centavos / (100 + tasa). */
const DEFAULT_IVA_RATE = 19
const CASCADE_DECIMALS = 6
const MONEY_DECIMALS = 2

function toCentavos(pesos) {
  const numeric = Number(pesos)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0
  }
  return Math.round(numeric * 100)
}

function fromCentavos(centavos) {
  return centavos / 100
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100
}

/**
 * Redondeo en cadena: trunca a `fromDecimals` y redondea dígito a dígito hasta `toDecimals`.
 * Si el dígito de más a la derecha es ≥ 5, sube el de la izquierda.
 */
export function roundCascadeRational(
  numerator,
  denominator,
  fromDecimals = CASCADE_DECIMALS,
  toDecimals = MONEY_DECIMALS,
) {
  const num = BigInt(numerator)
  const den = BigInt(denominator)
  if (den === 0n || num <= 0n) {
    return 0
  }

  const fromScale = 10n ** BigInt(fromDecimals)
  let scaled = (num * fromScale) / den
  let decimals = fromDecimals

  while (decimals > toDecimals) {
    const lastDigit = scaled % 10n
    scaled = scaled / 10n
    if (lastDigit >= 5n) {
      scaled += 1n
    }
    decimals -= 1
  }

  return Number(scaled) / (10 ** toDecimals)
}

/**
 * Tasa IVA efectiva de un ítem/producto.
 * - Si `iva` API es 0 (o exento por tasa) → 0
 * - Si viene tasa > 0 → esa tasa
 * - Si no hay dato fiscal → 19% (comportamiento histórico)
 */
export function resolveItemIvaRate(source) {
  if (isProductTaxExempt(source)) {
    return 0
  }
  const rate = readProductIvaRate(source)
  if (rate != null && rate > 0) {
    return rate
  }
  return DEFAULT_IVA_RATE
}

/**
 * Precio de API = bruto (con IVA si aplica).
 * Exento / iva 0 → neto = bruto, iva = 0.
 * Con tasa → neto = bruto / (1 + tasa/100), iva = bruto − neto.
 */
export function splitGrossAmount(grossPesos, fiscalSource = null) {
  const grossCentavos = toCentavos(grossPesos)
  if (grossCentavos <= 0) {
    return { bruto: 0, neto: 0, iva: 0, rate: 0 }
  }

  const bruto = fromCentavos(grossCentavos)
  const rate = fiscalSource == null
    ? DEFAULT_IVA_RATE
    : resolveItemIvaRate(fiscalSource)

  if (!rate || rate <= 0) {
    return { bruto, neto: bruto, iva: 0, rate: 0 }
  }

  const divisor = BigInt(100 + Math.round(rate))
  const neto = roundCascadeRational(grossCentavos, divisor)
  const iva = roundMoney(bruto - neto)

  return { bruto, neto, iva, rate }
}

export function splitLineAmount(price, quantity = 1, fiscalSource = null) {
  const qty = Number(quantity)
  const unit = Number(price)
  const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 0
  const safeUnit = Number.isFinite(unit) && unit > 0 ? unit : 0
  return splitGrossAmount(roundMoney(safeUnit * safeQty), fiscalSource)
}

/**
 * Pedido = suma de líneas ya redondeadas. No se recalcula IVA sobre el total.
 * subtotal = netos, iva = suma de IVA de línea, total = brutos.
 * Cada línea usa su `iva` / `exento` del producto.
 */
export function summarizeCartItems(items = []) {
  return items.reduce(
    (acc, item) => {
      const line = splitLineAmount(item.price ?? item.precio, item.quantity, item)
      acc.subtotal = roundMoney(acc.subtotal + line.neto)
      acc.iva = roundMoney(acc.iva + line.iva)
      acc.total = roundMoney(acc.total + line.bruto)
      return acc
    },
    { subtotal: 0, iva: 0, total: 0 },
  )
}

/**
 * Etiqueta de desglose: "IVA (19%)" solo si todas las líneas gravadas van a 19%;
 * "IVA" si hay exentos, tasas mixtas o sin dato uniforme.
 */
export function getIvaBreakdownLabel(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'IVA (19%)'
  }

  const rates = items.map((item) => resolveItemIvaRate(item))
  const unique = [...new Set(rates)]
  if (unique.length === 1 && unique[0] === DEFAULT_IVA_RATE) {
    return 'IVA (19%)'
  }
  if (unique.length === 1 && unique[0] === 0) {
    return 'IVA'
  }
  return 'IVA'
}

export { DEFAULT_IVA_RATE }
