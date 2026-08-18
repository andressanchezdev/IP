/** IVA 19% incluido en el bruto: neto = bruto / 1,19 = (centavos de bruto) / 119. */
const IVA_DIVISOR = 119n
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

/** Precio de API = bruto (con IVA). Neto en cadena + IVA = bruto − neto. */
export function splitGrossAmount(grossPesos) {
  const grossCentavos = toCentavos(grossPesos)
  if (grossCentavos <= 0) {
    return { bruto: 0, neto: 0, iva: 0 }
  }

  const bruto = fromCentavos(grossCentavos)
  const neto = roundCascadeRational(grossCentavos, IVA_DIVISOR)
  const iva = roundMoney(bruto - neto)

  return { bruto, neto, iva }
}

export function splitLineAmount(price, quantity = 1) {
  const qty = Number(quantity)
  const unit = Number(price)
  const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 0
  const safeUnit = Number.isFinite(unit) && unit > 0 ? unit : 0
  return splitGrossAmount(roundMoney(safeUnit * safeQty))
}

/**
 * Pedido = suma de líneas ya redondeadas. No se recalcula IVA sobre el total.
 * subtotal = netos, iva = suma de IVA de línea, total = brutos.
 */
export function summarizeCartItems(items = []) {
  return items.reduce(
    (acc, item) => {
      const line = splitLineAmount(item.price ?? item.precio, item.quantity)
      acc.subtotal = roundMoney(acc.subtotal + line.neto)
      acc.iva = roundMoney(acc.iva + line.iva)
      acc.total = roundMoney(acc.total + line.bruto)
      return acc
    },
    { subtotal: 0, iva: 0, total: 0 },
  )
}
