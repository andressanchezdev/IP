/** Parsea un valor de input con formato miles (es-CO) a número entero. */
export function parseCurrencyInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) {
    return 0
  }
  return Number(digits)
}

/** Formatea un número o string numérico como 125.000 (sin símbolo $). */
export function formatCurrencyInput(value) {
  const amount = typeof value === 'number' ? value : parseCurrencyInput(value)
  if (!amount) {
    return ''
  }
  return amount.toLocaleString('es-CO')
}
