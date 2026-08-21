import { ORDER_STEP_DEFS } from '@/features/orders/constants/orderSteps'
import { enrichOrder } from './enrichOrder'
import {
  paymentTypeLabel,
  resolveCheckoutPaymentType,
} from './resolveCheckoutPaymentType'
import { resolvePaymentDeadline } from './resolvePaymentDeadline'
import { summarizeCartItems } from '@/shared/lib/money'

function snapshotCartItems(cartItems = []) {
  return cartItems.map((item) => ({
    id: item.id,
    cartId: item.cartId ?? null,
    reference: item.reference ?? item.id,
    category: item.category ?? '',
    description: item.description ?? '',
    brand: item.brand ?? '',
    model: item.model ?? '',
    quantity: Number(item.quantity) || 0,
    price: Number(item.price) || 0,
    imageUrl: item.imageUrl || item.brandLogo || item.brandLogoUrl || '',
    brandLogo: item.brandLogo || item.brandLogoUrl || '',
  }))
}

/** Construye el pedido completo que pasa del checkout a la vista de espera. */
export function buildCheckoutOrder({
  cartItems,
  userId,
  clientData,
  paymentType,
  paymentDetails,
}) {
  const now = new Date()
  const items = snapshotCartItems(cartItems)
  const totals = summarizeCartItems(items)
  const subtotal = totals.subtotal
  const iva = totals.iva
  const total = Number(paymentDetails?.amount) || totals.total
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  const resolvedType = resolveCheckoutPaymentType(paymentType, paymentDetails)
  const methodLabel = paymentTypeLabel(resolvedType)
  const initialStatus = ORDER_STEP_DEFS[0].currentLabel
  const paymentLimitDays = Number(paymentDetails?.paymentLimitDays)
  const deadlineInfo = resolvePaymentDeadline({
    createdAt: now,
    paymentLimitDays: Number.isFinite(paymentLimitDays) && paymentLimitDays > 0
      ? paymentLimitDays
      : null,
  })
  const checkoutDetails = {
    ...paymentDetails,
    checkoutPaymentType: paymentType,
    resolvedPaymentType: resolvedType,
    subtotal,
    iva,
    shippingCost: 0,
    proofVerified: Boolean(paymentDetails?.proofVerified),
    paymentLimitDays: deadlineInfo.days,
  }

  const client = {
    fullName: clientData?.fullName || '',
    email: clientData?.email || '',
    phone: clientData?.phone || clientData?.mobile || '',
    mobile: clientData?.mobile || clientData?.phone || '',
    documentId: clientData?.documentId || '',
    address: clientData?.address || clientData?.profileAddress || '',
    profileAddress: clientData?.profileAddress || '',
    notes: clientData?.notes || '',
    city: clientData?.city || '',
    department: clientData?.department || '',
  }

  return enrichOrder({
    id: `PED-${Date.now()}`,
    userId,
    invoiceNumber: `FAC-${Date.now()}`,
    createdAt: now.toISOString(),
    dateLimit: deadlineInfo.deadlineIso,
    dateLimitLabel: deadlineInfo.dateLimitLabel,
    paymentLimitDays: deadlineInfo.days,
    orderType: 'general',
    estado: 'verificacion',
    items,
    client,
    paymentMethod: methodLabel,
    total,
    subtotal,
    iva,
    status: initialStatus,
    payment: {
      method: methodLabel,
      type: resolvedType,
      deadline: deadlineInfo.deadlineIso,
      amount: total,
      paidAmount: 0,
      payments: [],
      paymentsMade: 0,
      paymentsTotal: 3,
      checkoutDetails,
      details: checkoutDetails,
      lastPaymentAt: null,
    },
    packaging: {
      productCount: items.length,
      totalQuantity,
    },
    delivery: {
      date: new Date(Date.now() + 3 * 86400000).toISOString(),
      address: client.address,
      notes: client.notes || 'Entregar en horario de oficina',
      deliveredBy: 'Transportes Premium',
      receivedBy: client.fullName || 'Cliente autorizado',
      mapLocation: clientData?.mapLocation ?? null,
    },
  })
}
