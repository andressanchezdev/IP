export function matchesOrderIdSearch(order, query) {
  const trimmed = query.trim()
  if (!trimmed) {
    return true
  }

  const normalizedQuery = trimmed.toLowerCase()
  const orderId = order.id.toLowerCase()
  const queryDigits = trimmed.replace(/\D/g, '')
  const orderDigits = order.id.replace(/\D/g, '')

  return (
    orderId.includes(normalizedQuery) ||
    (queryDigits.length > 0 && orderDigits.includes(queryDigits))
  )
}
