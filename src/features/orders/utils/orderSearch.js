export function matchesOrderIdSearch(order, query) {
  const trimmed = query.trim()
  if (!trimmed) {
    return true
  }

  const normalizedQuery = trimmed.toLowerCase()
  const orderIdValue = order?.idventa ?? order?.id ?? ''
  const orderId = String(orderIdValue).toLowerCase()
  const queryDigits = trimmed.replace(/\D/g, '')
  const orderDigits = String(orderIdValue).replace(/\D/g, '')

  return (
    orderId.includes(normalizedQuery) ||
    (queryDigits.length > 0 && orderDigits.includes(queryDigits))
  )
}
