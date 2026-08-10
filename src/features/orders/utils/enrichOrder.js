import { ORDER_STEPS } from '@/features/orders/constants/orderSteps'

const DEFAULT_SALES_POINTS = [
  { id: '001', name: 'tienda1online' },
  { id: '002', name: 'tienda2online' },
]

export function enrichOrder(order) {
  if (!order) {
    return null
  }

  const totalQuantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  const numericId = order.id?.replace(/\D/g, '') ?? Date.now()
  const paymentMethod = order.paymentMethod ?? 'Efectivo'
  const isCompleted = ORDER_STEPS.indexOf(order.status) >= ORDER_STEPS.length - 1

  return {
    ...order,
    invoiceNumber: order.invoiceNumber ?? `FAC-${numericId}`,
    orderType: order.orderType ?? 'general',
    processStatus: order.processStatus ?? (isCompleted ? 'completado' : 'en proceso...'),
    payment: {
      method: order.payment?.method ?? paymentMethod,
      type: order.payment?.type ?? paymentMethod.toLowerCase(),
      deadline: order.payment?.deadline ?? order.dateLimit ?? new Date(Date.now() + 7 * 86400000).toISOString(),
      amount: order.payment?.amount ?? order.total ?? 0,
      paidAmount: order.payment?.paidAmount ?? 0,
      payments: order.payment?.payments ?? [],
      paymentsMade: order.payment?.paymentsMade ?? 0,
      paymentsTotal: order.payment?.paymentsTotal ?? 3,
      checkoutDetails: order.payment?.checkoutDetails ?? order.payment?.details ?? {},
      details: order.payment?.details ?? {},
      lastPaymentAt: order.payment?.lastPaymentAt ?? null,
    },
    packaging: {
      packedQuantity: order.packaging?.packedQuantity ?? Math.min(totalQuantity, Math.max(totalQuantity - 5, 0)),
      totalQuantity: order.packaging?.totalQuantity ?? totalQuantity,
      boxes: order.packaging?.boxes ?? Math.max(1, Math.ceil(totalQuantity / 20)),
      bags: order.packaging?.bags ?? Math.max(1, Math.ceil(totalQuantity / 10)),
    },
    delivery: {
      date: order.delivery?.date ?? new Date(Date.now() + 3 * 86400000).toISOString(),
      address: order.delivery?.address ?? 'Calle 45 #12-34, Bogotá',
      notes: order.delivery?.notes ?? 'Entregar en horario de oficina',
      deliveredBy: order.delivery?.deliveredBy ?? 'Transportes Premium',
      receivedBy: order.delivery?.receivedBy ?? 'Cliente autorizado',
    },
    salesPoints: order.salesPoints ?? DEFAULT_SALES_POINTS,
    selectedSalesPointId: order.selectedSalesPointId ?? DEFAULT_SALES_POINTS[0].id,
  }
}
