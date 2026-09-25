import { useCallback, useMemo, useState } from 'react'
import { enrichOrder } from '@/features/orders/utils/enrichOrder'
import { getCurrentFlowLabel } from '@/features/orders/constants/orderSteps'
import {
  ABONO_STATUS,
  getCreditRemainingDue,
  getCreditRemainingForNewAbono,
  sumVerifiedAbonos,
} from '@/features/orders/constants/abonoStatus'
import { getManagementSales } from '@/features/orders/api/salesApi'
import {
  mapSalesToCreditHistoryOrders,
  mapSalesToPendingOrders,
} from '@/features/orders/mappers/mapSalesHistory'
import { useOrderFlowWebSocket } from '@/features/orders/ws/useOrderFlowWebSocket'
import { APP_EVENTS } from '../appEvents'

function matchOrderId(entry, orderId) {
  const key = String(orderId ?? '').trim()
  if (!key || !entry) {
    return false
  }
  return String(entry.id ?? '').trim() === key
    || String(entry.idventa ?? '').trim() === key
    || String(entry.claveVenta ?? '').trim() === key
    || String(entry.clave_venta ?? '').trim() === key
}

function findOrderLists(pendingOrders, historyOrders, orderId) {
  const pending = pendingOrders.find((entry) => matchOrderId(entry, orderId))
  if (pending) {
    return { order: pending, source: 'pending' }
  }
  const history = historyOrders.find((entry) => matchOrderId(entry, orderId))
  if (history) {
    return { order: history, source: 'history' }
  }
  return { order: null, source: null }
}

function resolveOrderRefId(order) {
  const fromId = String(order?.id ?? '').trim()
  if (fromId) {
    return fromId
  }
  const fromVenta = String(order?.idventa ?? '').trim()
  if (fromVenta) {
    return fromVenta
  }
  return String(order?.claveVenta ?? order?.clave_venta ?? '').trim()
}

function mergeLocalPayments(mappedOrders, previousOrders) {
  const localByKey = new Map()
  previousOrders.forEach((entry) => {
    const payments = entry?.payment?.payments
    if (!Array.isArray(payments) || payments.length === 0) {
      return
    }
    const keys = [
      String(entry.id ?? '').trim(),
      String(entry.idventa ?? '').trim(),
      String(entry.claveVenta ?? entry.clave_venta ?? '').trim(),
    ].filter(Boolean)
    keys.forEach((key) => {
      localByKey.set(key, entry.payment)
    })
  })

  return mappedOrders.map((order) => {
    const keys = [
      String(order.id ?? '').trim(),
      String(order.idventa ?? '').trim(),
      String(order.claveVenta ?? order.clave_venta ?? '').trim(),
    ].filter(Boolean)
    const localPayment = keys.map((key) => localByKey.get(key)).find(Boolean)
    if (!localPayment) {
      return order
    }
    const payments = localPayment.payments ?? []
    const paidAmount = sumVerifiedAbonos(payments)
    return {
      ...order,
      payment: {
        ...(order.payment ?? {}),
        ...localPayment,
        amount: order.payment?.amount ?? order.total ?? localPayment.amount,
        paidAmount,
        payments,
        paymentsMade: payments.length,
      },
    }
  })
}

export function useOrdersSlice({
  events,
  initialPendingOrders,
  initialHistoryOrders,
  tokenAccess = null,
}) {
  const [pendingOrders, setPendingOrders] = useState(() => initialPendingOrders)
  const [historyOrders, setHistoryOrders] = useState(() => initialHistoryOrders)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyLoadError, setHistoryLoadError] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [orderSubView, setOrderSubView] = useState(null)
  /** Focus del accordion del drawer: { sections, nonce } — nonce fuerza re-apertura. */
  const [orderDrawerFocus, setOrderDrawerFocus] = useState(null)

  useOrderFlowWebSocket({
    enabled: Boolean(tokenAccess),
    setPendingOrders,
  })

  const resetOrderDrawer = useCallback(() => {
    setSelectedOrderId(null)
    setOrderSubView(null)
    setOrderDrawerFocus(null)
  }, [])

  const clearOrderDrawerFocus = useCallback(() => {
    setOrderDrawerFocus(null)
  }, [])

  const addPendingOrder = useCallback((order) => {
    if (!order?.id) {
      return
    }
    const enriched = enrichOrder(order)
    setPendingOrders((current) => [
      enriched,
      ...current.filter((entry) => entry.id !== enriched.id),
    ])
  }, [])

  const openOrderDrawer = useCallback((orderId) => {
    const key = String(orderId ?? '').trim()
    if (!key) {
      return
    }
    const { order } = findOrderLists(pendingOrders, historyOrders, key)
    setSelectedOrderId(resolveOrderRefId(order) || key)
    setOrderSubView(null)
    setOrderDrawerFocus(null)
    events.emit(APP_EVENTS.ORDER_OPENED)
  }, [events, historyOrders, pendingOrders])

  const openOrderPayments = useCallback((orderId) => {
    const key = String(orderId ?? '').trim()
    if (!key) {
      return
    }
    const { order } = findOrderLists(pendingOrders, historyOrders, key)
    // Mismo destino que order-payment__add-btn → subvista payments
    setSelectedOrderId(resolveOrderRefId(order) || key)
    setOrderSubView('payments')
    setOrderDrawerFocus(null)
    events.emit(APP_EVENTS.ORDER_OPENED)
  }, [events, historyOrders, pendingOrders])

  const openOrderAbonos = useCallback((orderId) => {
    const key = String(orderId ?? '').trim()
    if (!key) {
      return
    }
    const { order } = findOrderLists(pendingOrders, historyOrders, key)
    const canonicalId = resolveOrderRefId(order) || key
    setSelectedOrderId(canonicalId)
    setOrderSubView(null)
    // nonce único: el ojito «Ver» siempre reabre Información de pago
    setOrderDrawerFocus({ sections: ['payment'], nonce: Date.now() })
    events.emit(APP_EVENTS.ORDER_OPENED)
  }, [events, historyOrders, pendingOrders])

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return null
    }

    const order = pendingOrders.find((entry) => matchOrderId(entry, selectedOrderId))
      ?? historyOrders.find((entry) => matchOrderId(entry, selectedOrderId))

    return enrichOrder(order)
  }, [selectedOrderId, pendingOrders, historyOrders])

  const formalizeOrderPayment = useCallback((orderId, { type, ...details }) => {
    const methodLabels = {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia',
      credito: 'Crédito',
    }

    const { order, source } = findOrderLists(pendingOrders, historyOrders, orderId)
    if (!order) {
      return { success: false, reason: 'not-found' }
    }

    const payment = order.payment ?? {}
    const paymentAmount = Number(type === 'efectivo' ? details.amountReceived : details.amount)
    const total = Number(order.total ?? payment.amount ?? 0)
    const paymentsList = payment.payments ?? []
    const remainingForNew = getCreditRemainingForNewAbono(total, paymentsList)
    const paidVerified = sumVerifiedAbonos(paymentsList)

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return { success: false, reason: 'invalid-amount' }
    }

    if (paymentAmount > remainingForNew) {
      return { success: false, reason: 'exceeds-balance', remainingAmount: remainingForNew }
    }

    const now = new Date().toISOString()
    const abono = {
      id: `abono-${now}-${paymentsList.length + 1}`,
      amount: paymentAmount,
      type,
      status: ABONO_STATUS.REVISION,
      noveltyReason: '',
      details: { ...details },
      createdAt: now,
    }
    const payments = [...paymentsList, abono]
    const nextPaidAmount = sumVerifiedAbonos(payments)
    const remainingDue = getCreditRemainingDue(total, payments)

    const updatedOrder = {
      ...order,
      paymentMethod: order.paymentMethod ?? methodLabels.credito ?? order.metodo_pago,
      processStatus: getCurrentFlowLabel(order.status ?? order.estado),
      payment: {
        ...payment,
        type: payment.type === 'credito' ? 'credito' : (payment.type ?? 'credito'),
        method: payment.method ?? order.metodo_pago ?? methodLabels.credito,
        amount: total,
        paidAmount: nextPaidAmount,
        payments,
        paymentsMade: payments.length,
        details: payment.details ?? {},
        checkoutDetails: payment.checkoutDetails ?? payment.details ?? {},
        lastPaymentAt: now,
      },
    }

    if (source === 'pending') {
      setPendingOrders((currentOrders) =>
        currentOrders.map((entry) => (matchOrderId(entry, orderId) ? updatedOrder : entry)),
      )
    } else {
      setHistoryOrders((currentOrders) =>
        currentOrders.map((entry) => (matchOrderId(entry, orderId) ? updatedOrder : entry)),
      )
    }
    setOrderSubView(null)

    return {
      success: true,
      isFullyPaid: false,
      status: ABONO_STATUS.REVISION,
      paidAmount: nextPaidAmount,
      remainingAmount: remainingDue,
      previousPaidAmount: paidVerified,
    }
  }, [historyOrders, pendingOrders])

  /**
   * Transición de estado de abono (asesor/admin). El cliente no la usa en UI;
   * queda lista para API futura. Solo `verificado` afecta el saldo.
   */
  const updateAbonoStatus = useCallback((orderId, abonoId, { status, noveltyReason = '' } = {}) => {
    const nextStatus = String(status || '').trim().toLowerCase()
    if (![ABONO_STATUS.REVISION, ABONO_STATUS.VERIFICADO, ABONO_STATUS.NOVEDAD].includes(nextStatus)) {
      return { success: false, reason: 'invalid-status' }
    }
    if (nextStatus === ABONO_STATUS.NOVEDAD && !String(noveltyReason || '').trim()) {
      return { success: false, reason: 'novelty-reason-required' }
    }

    const { order, source } = findOrderLists(pendingOrders, historyOrders, orderId)
    if (!order) {
      return { success: false, reason: 'not-found' }
    }

    const payment = order.payment ?? {}
    const paymentsList = payment.payments ?? []
    const targetIndex = paymentsList.findIndex((entry) => String(entry.id) === String(abonoId))
    if (targetIndex < 0) {
      return { success: false, reason: 'abono-not-found' }
    }

    const now = new Date().toISOString()
    const payments = paymentsList.map((entry, index) => {
      if (index !== targetIndex) {
        return entry
      }
      return {
        ...entry,
        status: nextStatus,
        noveltyReason: nextStatus === ABONO_STATUS.NOVEDAD ? String(noveltyReason).trim() : '',
        reviewedAt: now,
      }
    })

    const total = Number(order.total ?? payment.amount ?? 0)
    const nextPaidAmount = sumVerifiedAbonos(payments)
    const remainingDue = getCreditRemainingDue(total, payments)
    const isFullyPaid = remainingDue <= 0

    const updatedOrder = {
      ...order,
      processStatus: isFullyPaid ? 'completado' : getCurrentFlowLabel(order.status ?? order.estado),
      payment: {
        ...payment,
        paidAmount: nextPaidAmount,
        payments,
        paymentsMade: payments.length,
        lastPaymentAt: now,
      },
    }

    if (source === 'pending' && isFullyPaid) {
      setPendingOrders((currentOrders) => currentOrders.filter((entry) => !matchOrderId(entry, orderId)))
      setHistoryOrders((currentOrders) => [
        updatedOrder,
        ...currentOrders.filter((entry) => !matchOrderId(entry, orderId)),
      ])
      resetOrderDrawer()
      events.emit(APP_EVENTS.ORDER_COMPLETED)
    } else if (source === 'pending') {
      setPendingOrders((currentOrders) =>
        currentOrders.map((entry) => (matchOrderId(entry, orderId) ? updatedOrder : entry)),
      )
    } else {
      setHistoryOrders((currentOrders) =>
        currentOrders.map((entry) => (matchOrderId(entry, orderId) ? updatedOrder : entry)),
      )
    }

    return { success: true, isFullyPaid, paidAmount: nextPaidAmount, remainingAmount: remainingDue }
  }, [events, historyOrders, pendingOrders, resetOrderDrawer])

  /**
   * Marca el comprobante de transferencia como real y aplica el abono
   * (parcial o 100% si cubre el total del pedido).
   */
  const verifyTransferProof = useCallback((orderId, { verified = true } = {}) => {
    if (!verified) {
      return { success: false, reason: 'not-verified' }
    }

    const order = pendingOrders.find((entry) => matchOrderId(entry, orderId))
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
    const paymentsList = payment.payments ?? []
    const paidAmount = sumVerifiedAbonos(paymentsList)
    const applyAmount = Math.min(Math.max(0, proofAmount), Math.max(0, total - paidAmount))
    const now = new Date().toISOString()

    const nextDetails = {
      ...details,
      proofVerified: true,
      proofVerifiedAt: now,
    }

    const payments = [
      ...paymentsList,
      {
        id: `abono-${now}-proof`,
        amount: applyAmount,
        type: 'transferencia',
        status: ABONO_STATUS.VERIFICADO,
        noveltyReason: '',
        details: { ...nextDetails, source: 'comprobante' },
        createdAt: now,
        reviewedAt: now,
      },
    ]
    const nextPaidAmount = sumVerifiedAbonos(payments)
    const isFullyPaid = getCreditRemainingDue(total, payments) <= 0

    const updatedOrder = {
      ...order,
      processStatus: isFullyPaid ? 'completado' : getCurrentFlowLabel(order.status ?? order.estado),
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
      setPendingOrders((currentOrders) => currentOrders.filter((entry) => !matchOrderId(entry, orderId)))
      setHistoryOrders((currentOrders) => [
        updatedOrder,
        ...currentOrders.filter((entry) => !matchOrderId(entry, orderId)),
      ])
      resetOrderDrawer()
      events.emit(APP_EVENTS.ORDER_COMPLETED)
    } else {
      setPendingOrders((currentOrders) =>
        currentOrders.map((entry) => (matchOrderId(entry, orderId) ? updatedOrder : entry)),
      )
    }

    return { success: true, isFullyPaid, appliedAmount: applyAmount }
  }, [events, pendingOrders, resetOrderDrawer])

  const loadHistoryFromApi = useCallback(async ({ token, signal } = {}) => {
    if (!token) {
      setHistoryOrders([])
      setPendingOrders([])
      setHistoryLoadError('Sesión requerida')
      return { success: false, error: 'Sesión requerida', needsAuth: true }
    }

    setIsLoadingHistory(true)
    setHistoryLoadError('')
    try {
      const response = await getManagementSales({ token, signal })
      const mappedPending = mapSalesToPendingOrders(response.data)
      const mappedCreditHistory = mapSalesToCreditHistoryOrders(response.data)
      const apiIds = new Set(mappedPending.map((entry) => String(entry.id)))

      setPendingOrders((current) => {
        const localCheckout = current.filter((entry) => (
          entry?.source === 'checkout' && !apiIds.has(String(entry.id))
        ))
        return mergeLocalPayments([...localCheckout, ...mappedPending], current)
      })
      setHistoryOrders((current) => mergeLocalPayments(mappedCreditHistory, current))
      return {
        success: true,
        pendingOrders: mappedPending,
        historyOrders: mappedCreditHistory,
        meta: response.meta,
      }
    } catch (error) {
      const message = error?.message || 'No se pudo cargar el historial'
      setHistoryLoadError(message)
      return { success: false, error: message }
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  const value = useMemo(() => ({
    pendingOrders,
    historyOrders,
    isLoadingHistory,
    historyLoadError,
    selectedOrderId,
    selectedOrder,
    orderSubView,
    setOrderSubView,
    openOrderDrawer,
    openOrderPayments,
    openOrderAbonos,
    orderDrawerFocus,
    clearOrderDrawerFocus,
    addPendingOrder,
    formalizeOrderPayment,
    updateAbonoStatus,
    verifyTransferProof,
    loadHistoryFromApi,
  }), [
    pendingOrders,
    historyOrders,
    isLoadingHistory,
    historyLoadError,
    selectedOrderId,
    selectedOrder,
    orderSubView,
    openOrderDrawer,
    openOrderPayments,
    openOrderAbonos,
    orderDrawerFocus,
    clearOrderDrawerFocus,
    addPendingOrder,
    formalizeOrderPayment,
    updateAbonoStatus,
    verifyTransferProof,
    loadHistoryFromApi,
  ])

  return {
    pendingOrders,
    setPendingOrders,
    historyOrders,
    setHistoryOrders,
    isLoadingHistory,
    historyLoadError,
    loadHistoryFromApi,
    resetOrderDrawer,
    addPendingOrder,
    value,
  }
}
