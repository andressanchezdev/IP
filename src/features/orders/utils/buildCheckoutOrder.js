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
    // Fiscales del producto (API: iva, exento, compra) para totales / futuro POST.
    ...(item.iva != null ? { iva: Number(item.iva) } : {}),
    ...(item.exento != null ? { exento: Number(item.exento) } : {}),
    ...(item.compra != null ? { compra: Number(item.compra) } : {}),
  }))
}

/** Construye el pedido completo que pasa del checkout a la vista de espera. */
export function buildCheckoutOrder({
  cartItems,
  userId,
  clientData,
  paymentType,
  paymentDetails,
  salesRequest = null,
  salesResponse = null,
}) {
  const now = new Date()
  const items = snapshotCartItems(cartItems)
  const totals = summarizeCartItems(items)
  const subtotal = totals.subtotal
  const iva = totals.iva
  const total = Number(paymentDetails?.amount) || Number(salesRequest?.total) || totals.total
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
    salesRequest: salesRequest ?? null,
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

  const sale = salesResponse && typeof salesResponse === 'object' ? salesResponse : null
  const idVenta = Number(sale?.id_venta)
  const claveVenta = String(sale?.clave_venta ?? '').trim()
  const orderId = claveVenta
    || (Number.isFinite(idVenta) && idVenta > 0 ? String(idVenta) : `PED-${Date.now()}`)
  const invoiceNumber = claveVenta
    || (Number.isFinite(idVenta) && idVenta > 0 ? `FAC-${idVenta}` : `FAC-${Date.now()}`)
  const createdAt = sale?.fecha
    ? String(sale.fecha)
    : (salesRequest?.fecha || now.toISOString())

  return enrichOrder({
    id: orderId,
    idventa: Number.isFinite(idVenta) && idVenta > 0 ? idVenta : null,
    clave_venta: claveVenta || null,
    claveVenta: claveVenta || null,
    userId,
    source: 'checkout',
    invoiceNumber,
    createdAt,
    dateLimit: deadlineInfo.deadlineIso,
    dateLimitLabel: deadlineInfo.dateLimitLabel,
    paymentLimitDays: deadlineInfo.days,
    orderType: 'general',
    estado: String(sale?.estado ?? 'verificacion').trim() || 'verificacion',
    metodo_pago: salesRequest?.metodo_pago || resolvedType,
    items,
    client,
    paymentMethod: methodLabel,
    total: Number(sale?.total) || total,
    subtotal,
    iva,
    status: initialStatus,
    payment: {
      method: methodLabel,
      type: resolvedType,
      deadline: deadlineInfo.deadlineIso,
      amount: Number(sale?.total) || total,
      paidAmount: 0,
      payments: Array.isArray(sale?.pagos) ? sale.pagos : [],
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
      address: client.address || salesRequest?.direccion || '',
      mapLocation: clientData?.mapLocation ?? null,
    },
  })
}

