import { useCallback, useMemo, useState } from 'react'
import { enrichOrder } from '@/features/orders/utils/enrichOrder'
import { APP_EVENTS } from '../appEvents'

export function useOrdersSlice({
  events,
  initialPendingOrders,
  initialHistoryOrders,
}) {
  const [pendingOrders, setPendingOrders] = useState(() => initialPendingOrders)
  const [historyOrders, setHistoryOrders] = useState(() => initialHistoryOrders)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [orderSubView, setOrderSubView] = useState(null)

  const resetOrderDrawer = useCallback(() => {
    setSelectedOrderId(null)
    setOrderSubView(null)
  }, [])

  const openOrderDrawer = useCallback((orderId) => {
    setSelectedOrderId(orderId)
    events.emit(APP_EVENTS.ORDER_OPENED)
  }, [events])

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return null
    }

    const order = pendingOrders.find((entry) => entry.id === selectedOrderId)
      ?? historyOrders.find((entry) => entry.id === selectedOrderId)

    return enrichOrder(order)
  }, [selectedOrderId, pendingOrders, historyOrders])

  const formalizeOrderPayment = useCallback((orderId, { type, ...details }) => {
    const methodLabels = {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia',
      credito: 'Crédito',
    }

    const order = pendingOrders.find((entry) => entry.id === orderId)
    if (!order) {
      return { success: false, reason: 'not-found' }
    }

    const payment = order.payment ?? {}
    const paymentAmount = Number(type === 'efectivo' ? details.amountReceived : details.amount)
    const paidAmount = Number(payment.paidAmount ?? 0)
    const total = Number(order.total ?? payment.amount ?? 0)
    const remainingAmount = Math.max(0, total - paidAmount)

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return { success: false, reason: 'invalid-amount' }
    }

    if (paymentAmount > remainingAmount) {
      return { success: false, reason: 'exceeds-balance', remainingAmount }
    }

    const now = new Date().toISOString()
    const nextPaidAmount = paidAmount + paymentAmount
    const isFullyPaid = nextPaidAmount >= total
    const payments = [
      ...(payment.payments ?? []),
      { amount: paymentAmount, type, details, createdAt: now },
    ]
    const updatedOrder = {
      ...order,
      paymentMethod: methodLabels[type] ?? order.paymentMethod,
      processStatus: isFullyPaid ? 'completado' : (order.processStatus ?? 'en proceso...'),
      payment: {
        ...payment,
        type,
        method: methodLabels[type] ?? payment.method,
        paidAmount: nextPaidAmount,
        payments,
        paymentsMade: payments.length,
        details,
        lastPaymentAt: now,
      },
    }

    if (isFullyPaid) {
      setPendingOrders((currentOrders) => currentOrders.filter((entry) => entry.id !== orderId))
      setHistoryOrders((currentOrders) => [
        updatedOrder,
        ...currentOrders.filter((entry) => entry.id !== orderId),
      ])
      resetOrderDrawer()
      events.emit(APP_EVENTS.ORDER_COMPLETED)
    } else {
      setPendingOrders((currentOrders) =>
        currentOrders.map((entry) => (entry.id === orderId ? updatedOrder : entry)),
      )
      setOrderSubView(null)
    }

    return { success: true, isFullyPaid }
  }, [events, pendingOrders, resetOrderDrawer])

  /**
   * Marca el comprobante de transferencia como real y aplica el abono
   * (parcial o 100% si cubre el total del pedido).
   */
  const verifyTransferProof = useCallback((orderId, { verified = true } = {}) => {
    if (!verified) {
      return { success: false, reason: 'not-verified' }
    }

    const order = pendingOrders.find((entry) => entry.id === orderId)
    if (!order) {
      return { success: false, reason: 'not-found' }
    }

    const payment = order.payment ?? {}
    if (String(payment.type).toLowerCase() !== 'transferencia') {
      return { success: false, reason: 'wrong-type' }
    }

    const details = { ...(payment.checkoutDetails ?? payment.details ?? {}) }
    if (details.proofVerified) {
      return { success: true, isFullyPaid: false, alreadyVerified: true }
    }

    const total = Number(payment.amount ?? order.total ?? 0)
    const proofAmount = Number(details.amount) || total
    const paidAmount = Number(payment.paidAmount ?? 0)
    const applyAmount = Math.min(Math.max(0, proofAmount), Math.max(0, total - paidAmount))
    const nextPaidAmount = paidAmount + applyAmount
    const isFullyPaid = nextPaidAmount >= total
    const now = new Date().toISOString()

    const nextDetails = {
      ...details,
      proofVerified: true,
      proofVerifiedAt: now,
    }

    const payments = [
      ...(payment.payments ?? []),
      {
        amount: applyAmount,
        type: 'transferencia',
        details: { ...nextDetails, source: 'comprobante' },
        createdAt: now,
      },
    ]

    const updatedOrder = {
      ...order,
      processStatus: isFullyPaid ? 'completado' : (order.processStatus ?? 'en proceso...'),
      payment: {
        ...payment,
        paidAmount: nextPaidAmount,
        payments,
        paymentsMade: payments.length,
        checkoutDetails: nextDetails,
        details: nextDetails,
        lastPaymentAt: now,
      },
    }

    if (isFullyPaid) {
      setPendingOrders((currentOrders) => currentOrders.filter((entry) => entry.id !== orderId))
      setHistoryOrders((currentOrders) => [
        updatedOrder,
        ...currentOrders.filter((entry) => entry.id !== orderId),
      ])
      resetOrderDrawer()
      events.emit(APP_EVENTS.ORDER_COMPLETED)
    } else {
      setPendingOrders((currentOrders) =>
        currentOrders.map((entry) => (entry.id === orderId ? updatedOrder : entry)),
      )
    }

    return { success: true, isFullyPaid, appliedAmount: applyAmount }
  }, [events, pendingOrders, resetOrderDrawer])

  const value = useMemo(() => ({
    pendingOrders,
    historyOrders,
    selectedOrderId,
    selectedOrder,
    orderSubView,
    setOrderSubView,
    openOrderDrawer,
    formalizeOrderPayment,
    verifyTransferProof,
  }), [
    pendingOrders,
    historyOrders,
    selectedOrderId,
    selectedOrder,
    orderSubView,
    openOrderDrawer,
    formalizeOrderPayment,
    verifyTransferProof,
  ])

  return {
    pendingOrders,
    setPendingOrders,
    historyOrders,
    setHistoryOrders,
    resetOrderDrawer,
    value,
  }
}
