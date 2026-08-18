export function formatPrice(price) {
  const numeric = Number(price)
  const value = Number.isFinite(numeric) ? numeric : 0
  return `$${value.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
