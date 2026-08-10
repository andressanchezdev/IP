import { formatPrice } from './formatPrice'

export function downloadOrderPdf(title, items, total) {
  const content = [
    title,
    `Total: ${formatPrice(total)}`,
    ...items.map((item) => `${item.description} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`),
  ].join('\n')

  const blob = new Blob([content], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'pedido-importadora.pdf'
  link.click()
  window.URL.revokeObjectURL(url)
}
