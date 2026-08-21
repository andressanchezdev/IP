import { getCurrentFlowLabel, getOrderStepIndex, ORDER_STEP_DEFS } from '@/features/orders/constants/orderSteps'
import {
  PAYMENT_LIMIT_MISSING_MESSAGE,
  resolvePaymentDeadline,
  resolvePaymentLimitDays,
} from '@/features/orders/utils/resolvePaymentDeadline'

export function enrichOrder(order) {
  if (!order) {
    return null
  }

  const totalQuantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  const numericId = String(order.id ?? '').replace(/\D/g, '') || String(Date.now())
  const paymentMethod = order.paymentMethod ?? 'Efectivo'
  const statusLabel = getCurrentFlowLabel(order.status ?? order.estado)
  const stepIndex = getOrderStepIndex(order.status ?? order.estado)
  const isCompleted = stepIndex >= ORDER_STEP_DEFS.length - 1

  const paymentLimitDays = resolvePaymentLimitDays(order, {
    checkoutDetails: order.payment?.checkoutDetails,
    details: order.payment?.details,
  }) ?? order.paymentLimitDays ?? null

  const deadlineInfo = resolvePaymentDeadline({
    createdAt: order.createdAt ?? order.fecha,
    paymentLimitDays,
  })

  const deadlineIso = order.payment?.deadline
    || (typeof order.dateLimit === 'string' && order.dateLimit.includes('T')
      ? order.dateLimit
      : null)
    || deadlineInfo.deadlineIso
    || null

  const dateLimitLabel = order.dateLimitLabel
    || (deadlineInfo.hasLimit ? deadlineInfo.dateLimitLabel : PAYMENT_LIMIT_MISSING_MESSAGE)

  return {
    ...order,
    invoiceNumber: order.invoiceNumber ?? `FAC-${numericId}`,
    orderType: order.orderType ?? 'general',
    status: statusLabel,
    statusLabel,
    processStatus: statusLabel,
    paymentLimitDays: deadlineInfo.days,
    dateLimit: deadlineIso,
    dateLimitLabel,
    payment: {
      method: order.payment?.method ?? paymentMethod,
      type: order.payment?.type ?? String(paymentMethod).toLowerCase(),
      deadline: deadlineIso,
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
      productCount: order.packaging?.productCount
        ?? (order.items?.length ?? order.venta?.length ?? 0),
      totalQuantity: order.packaging?.totalQuantity ?? totalQuantity,
    },
    delivery: {
      date: order.delivery?.date ?? new Date(Date.now() + 3 * 86400000).toISOString(),
      address: order.delivery?.address ?? 'Calle 45 #12-34, Bogotá',
      notes: order.delivery?.notes ?? 'Entregar en horario de oficina',
      deliveredBy: order.delivery?.deliveredBy ?? 'Transportes Premium',
      receivedBy: order.delivery?.receivedBy ?? 'Cliente autorizado',
    },
    isCompleted,
  }
}
