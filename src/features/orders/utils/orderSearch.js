export function matchesOrderIdSearch(order, query) {
  const trimmed = query.trim()
  if (!trimmed) {
    return true
  }

  const normalizedQuery = trimmed.toLowerCase()
  const candidates = [
    order?.clave_venta,
    order?.claveVenta,
    order?.id,
    order?.idventa,
  ]
  const orderIdValue = candidates.find((value) => value != null && String(value).trim() !== '') ?? ''
  const orderId = String(orderIdValue).toLowerCase()
  const queryDigits = trimmed.replace(/\D/g, '')
  const orderDigits = String(orderIdValue).replace(/\D/g, '')

  return (
    orderId.includes(normalizedQuery) ||
    (queryDigits.length > 0 && orderDigits.includes(queryDigits))
  )
}
