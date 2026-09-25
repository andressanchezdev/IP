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
  const paymentMethod = order.paymentMethod ?? order.metodo_pago ?? 'Efectivo'
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

  const rawType = order.payment?.type ?? String(paymentMethod).toLowerCase()
  const resolvedType = rawType.includes('credito')
    ? 'credito'
    : rawType.includes('transfer')
      ? 'transferencia'
      : rawType.includes('efectivo')
        ? 'efectivo'
        : rawType

  return {
    ...order,
    invoiceNumber: order.invoiceNumber ?? `FAC-${numericId}`,
    orderType: order.orderType ?? 'general',
    status: statusLabel,
    statusLabel,
    processStatus: statusLabel,
    paymentMethod,
    paymentLimitDays: deadlineInfo.days,
    dateLimit: deadlineIso,
    dateLimitLabel,
    payment: {
      method: order.payment?.method ?? paymentMethod,
      type: resolvedType,
      deadline: deadlineIso,
      amount: order.payment?.amount ?? order.total ?? 0,
      paidAmount: order.payment?.paidAmount ?? 0,
      payments: order.payment?.payments ?? [],
      paymentsMade: order.payment?.paymentsMade ?? 0,
      paymentsTotal: order.payment?.paymentsTotal ?? 3,
      checkoutDetails: {
        paymentLimitDays,
        ...(order.payment?.checkoutDetails ?? order.payment?.details ?? {}),
      },
      details: order.payment?.details ?? { paymentLimitDays },
      lastPaymentAt: order.payment?.lastPaymentAt ?? null,
    },
    packaging: {
      productCount: order.packaging?.productCount
        ?? (order.items?.length ?? order.venta?.length ?? 0),
      totalQuantity: order.packaging?.totalQuantity ?? totalQuantity,
    },
    delivery: {
      address: order.delivery?.address
        || order.client?.address
        || '',
      mapLocation: order.delivery?.mapLocation ?? null,
    },
    isCompleted,
  }
}
