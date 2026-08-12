import { ORDER_STEPS } from '@/features/orders/constants/orderSteps'
import { PAYMENT_METHOD_LABELS } from '@/features/orders/constants/paymentConfig'
import { enrichOrder } from './enrichOrder'

/** Construye el pedido que pasa del checkout a la vista de espera. */
export function buildCheckoutOrder({
  cartItems,
  userId,
  clientData,
  paymentType,
  paymentDetails,
}) {
  const now = new Date()
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = Number(paymentDetails?.amount) || subtotal + Math.round(subtotal * 0.19)
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const methodLabel = PAYMENT_METHOD_LABELS[paymentType] ?? 'Efectivo'

  return enrichOrder({
    id: `PED-${Date.now()}`,
    userId,
    invoiceNumber: `FAC-${Date.now()}`,
    createdAt: now.toISOString(),
    dateLimit: new Date(Date.now() + 86400000).toISOString(),
    orderType: 'general',
    processStatus: 'en proceso...',
    items: cartItems,
    client: clientData,
    paymentMethod: methodLabel,
    total,
    status: ORDER_STEPS[0],
    steps: ORDER_STEPS,
    payment: {
      method: methodLabel,
      type: paymentType,
      deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      amount: total,
      paidAmount: 0,
      payments: [],
      paymentsMade: 0,
      paymentsTotal: 3,
      checkoutDetails: paymentDetails,
      details: paymentDetails,
      lastPaymentAt: null,
    },
    packaging: {
      packedQuantity: 0,
      totalQuantity,
      boxes: Math.max(1, Math.ceil(totalQuantity / 20)),
      bags: Math.max(1, Math.ceil(totalQuantity / 10)),
    },
    delivery: {
      date: new Date(Date.now() + 3 * 86400000).toISOString(),
      address: clientData.address,
      notes: clientData.notes || 'Entregar en horario de oficina',
      deliveredBy: 'Transportes Premium',
      receivedBy: clientData.fullName,
    },
    salesPoints: [
      { id: '001', name: 'tienda1online' },
      { id: '002', name: 'tienda2online' },
    ],
    selectedSalesPointId: '001',
  })
}
