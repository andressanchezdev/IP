import { useCallback, useMemo, useRef, useState } from 'react'
import { buildCheckoutOrder } from '@/features/orders/utils/buildCheckoutOrder'
import { formatSalesFecha } from '@/features/orders/api/salesApi'
import { postManagementSalesSafe } from '@/features/orders/api/salesApiSafe'
import { getCart } from '@/features/cart/api/cartApi'
import { persistCartItemSafe, removeCartItemSafe, clearCartMassiveSafe, updateCartItemSafe } from '@/features/cart/api/cartApiSafe'
import {
  planCartAdd,
  resolveCartProductId,
  resolveCartStock,
  resolveCartUnitPrice,
} from '@/features/cart/api/cartPostBody'
import { mapApiCartItems } from '@/features/catalog/mappers/mapCartItems'
import { enrichCartItemsFiscalFromCatalog } from '@/features/catalog/lib/productFiscalFields'
import { summarizeCartItems } from '@/shared/lib/money'
import { resolveCheckoutPaymentType } from '@/features/orders/utils/resolveCheckoutPaymentType'
import { APP_EVENTS } from '../appEvents'
import { normalizeCartItem } from '../helpers'

export function useCartSlice({
  events,
  tokenAccess,
  productsRef,
  authUsername,
  currentUserId,
  initialCartItems,
  cartHydratingRef: cartHydratingRefProp,
}) {
  const [cartItems, setCartItems] = useState(() => initialCartItems)
  const [cartCheckoutStep, setCartCheckoutStep] = useState(0)
  const [orderingProductIds, setOrderingProductIds] = useState(() => new Set())
  const cartItemsRef = useRef(cartItems)
  const orderingIdsRef = useRef(new Set())
  const internalHydratingRef = useRef(false)
  const cartHydratingRef = cartHydratingRefProp ?? internalHydratingRef
  cartItemsRef.current = cartItems

  const syncOrderingProductIds = useCallback(() => {
    setOrderingProductIds(new Set(orderingIdsRef.current))
  }, [])

  const isOrderingProduct = useCallback((productId) => (
    orderingIdsRef.current.has(String(productId))
    || orderingProductIds.has(String(productId))
  ), [orderingProductIds])

  // Authenticated cart is API-driven. commitCart only updates React state (no localStorage).
  const commitCart = useCallback((updater) => {
    setCartItems((currentItems) => (
      typeof updater === 'function' ? updater(currentItems) : updater
    ))
  }, [])

  const applyCartFromApi = useCallback(async ({ token }) => {
    const { carritos } = await getCart({ token })
    const apiCart = enrichCartItemsFiscalFromCatalog(
      mapApiCartItems(carritos).map(normalizeCartItem),
      productsRef.current,
    )
    setCartItems(apiCart)
    return apiCart
  }, [productsRef])

  const applyCartFromPayload = useCallback((carritos = [], catalogProducts = null) => {
    const apiCart = enrichCartItemsFiscalFromCatalog(
      mapApiCartItems(carritos).map(normalizeCartItem),
      catalogProducts ?? productsRef.current,
    )
    setCartItems(apiCart)
    return apiCart
  }, [productsRef])

  const refreshCartFromApi = useCallback(async () => {
    const token = tokenAccess
    if (!token) {
      return { success: false, error: 'Sin sesión' }
    }

    try {
      cartHydratingRef.current = true
      const apiCart = await applyCartFromApi({ token })
      return { success: true, cartItems: apiCart }
    } catch (error) {
      console.error('[cart] No se pudo cargar GET /api/v1/inventory/carts', error)
      return {
        success: false,
        error: error?.message || 'No se pudo cargar el carrito',
      }
    } finally {
      cartHydratingRef.current = false
    }
  }, [applyCartFromApi, tokenAccess])

  const persistCartItemToApi = useCallback(
    (payload) => persistCartItemSafe({ token: tokenAccess, ...payload }),
    [tokenAccess],
  )

  const removeCartItemFromApi = useCallback(
    (idCarrito) => removeCartItemSafe({ token: tokenAccess, idCarrito }),
    [tokenAccess],
  )

  const addToCart = useCallback(async (productId, quantity = 1, sourceProduct = null) => {
    if (!tokenAccess) {
      events.emit(APP_EVENTS.AUTH_REQUIRED, { pending: 'checkout' })
      return { success: false, needsAuth: true, error: 'Inicia sesión para agregar al carrito' }
    }

    if (quantity <= 0) {
      return { success: false, error: 'Cantidad inválida' }
    }

    const orderKey = String(productId)
    if (orderingIdsRef.current.has(orderKey)) {
      return { success: false, duplicate: true, error: 'Procesando pedido…' }
    }

    const listed = productsRef.current.find((item) => String(item.id) === String(productId))
    const sourceId = sourceProduct
      ? String(sourceProduct.id ?? sourceProduct.id_producto ?? '')
      : ''
    const product = (sourceProduct && (!sourceId || sourceId === String(productId)))
      ? sourceProduct
      : listed
    if (!product) {
      return { success: false, error: 'Sin stock disponible' }
    }

    const existing = cartItemsRef.current.find((item) => String(item.id) === String(productId))
    const previousQty = existing ? Number(existing.quantity) || 0 : 0
    const planned = planCartAdd({
      idProducto: resolveCartProductId(product, productId),
      requestedQty: quantity,
      stock: resolveCartStock(product),
      existingQty: previousQty,
      precioUnitario: existing?.price ?? resolveCartUnitPrice(product),
      // Fiscales del producto (id ≠ codigo). El body no incluye codigo.
      product,
      aplicacion: product?.aplicacion ?? existing?.aplicacion ?? '',
    })
    if (!planned.ok) {
      return { success: false, error: planned.reason }
    }

    orderingIdsRef.current.add(orderKey)
    syncOrderingProductIds()

    try {
      const persisted = await persistCartItemToApi({
        productId: planned.body.id_producto,
        cantidad: planned.body.cantidad,
        precioUnitario: planned.body.precio_unitario,
        compra: planned.body.compra,
        exento: planned.body.exento,
        iva: planned.body.iva,
        aplicacion: planned.body.aplicacion,
        fecha: planned.body.fecha,
        product,
      })
      if (!persisted.success) {
        return persisted
      }

      await refreshCartFromApi()
      return { success: true, quantity: planned.body.cantidad, previousQty, request: planned.body }
    } finally {
      orderingIdsRef.current.delete(orderKey)
      syncOrderingProductIds()
    }
  }, [tokenAccess, events, persistCartItemToApi, productsRef, refreshCartFromApi, syncOrderingProductIds])

  const removeFromCart = useCallback(async (productId) => {
    if (!tokenAccess) {
      return { success: false, needsAuth: true, error: 'Sesión requerida' }
    }

    const item = cartItemsRef.current.find((entry) => String(entry.id) === String(productId))
    if (!item) {
      return { success: false }
    }

    const removed = await removeCartItemFromApi(item.cartId)
    if (!removed.success) {
      return removed
    }

    await refreshCartFromApi()
    return { success: true }
  }, [tokenAccess, refreshCartFromApi, removeCartItemFromApi])

  /**
   * Actualiza cantidad vía PUT /api/v1/inventory/carts
   * Body (prueba = mismo shape que POST): { id_producto, cantidad, precio_unitario }
   */
  const setCartItemQuantity = useCallback(async (productId, quantity) => {
    if (!tokenAccess) {
      return { success: false, needsAuth: true, error: 'Sesión requerida' }
    }

    const target = cartItemsRef.current.find((item) => String(item.id) === String(productId))
    if (!target) {
      return { success: false, error: 'Ítem no encontrado' }
    }

    const product = productsRef.current.find((item) => String(item.id) === String(productId))
    const catalogStock = Number(product?.stock) || 0
    const totalAvailable = catalogStock + (Number(target.quantity) || 0)
    const nextQuantity = Math.max(1, Math.min(Number(quantity) || 1, totalAvailable || Number(quantity) || 1))
    const previousQty = Number(target.quantity) || 0

    if (nextQuantity === previousQty) {
      return { success: true, quantity: nextQuantity, previousQty }
    }

    const idProducto = resolveCartProductId(target, productId)
    const precioUnitario = resolveCartUnitPrice(target)

    const updated = await updateCartItemSafe({
      token: tokenAccess,
      productId: idProducto,
      cantidad: nextQuantity,
      precioUnitario,
    })

    if (!updated.success) {
      return {
        success: false,
        error: updated.error || 'No se pudo actualizar la cantidad',
        previousQty,
      }
    }

    await refreshCartFromApi()
    return {
      success: true,
      quantity: nextQuantity,
      previousQty,
      request: updated.request,
    }
  }, [tokenAccess, productsRef, refreshCartFromApi])

  const clearCart = useCallback(async () => {
    if (!tokenAccess) {
      commitCart([])
      return { success: true }
    }

    // Una petición massive; el WS aplica stock (stock eliminarTodo).
    const cleared = await clearCartMassiveSafe({ token: tokenAccess })
    if (!cleared.success) {
      return cleared
    }

    commitCart([])
    return { success: true }
  }, [tokenAccess, commitCart])

  const createOrderFromCheckout = useCallback(async ({
    clientData,
    paymentType,
    paymentDetails,
  }) => {
    if (cartItems.length === 0 || !currentUserId) {
      return { success: false, error: 'Carrito vacío o sin usuario' }
    }

    if (!tokenAccess) {
      events.emit(APP_EVENTS.AUTH_REQUIRED, { pending: 'checkout' })
      return { success: false, needsAuth: true, error: 'Sesión requerida' }
    }

    const resolvedType = resolveCheckoutPaymentType(paymentType, paymentDetails)
    const totals = summarizeCartItems(cartItems)
    const total = Number(paymentDetails?.amount) || totals.total
    const direccion = String(
      clientData?.address
      || clientData?.profileAddress
      || '',
    ).trim()

    if (!direccion) {
      return { success: false, error: 'Dirección de entrega requerida' }
    }
    if (!Number.isFinite(total) || total <= 0) {
      return { success: false, error: 'Total inválido' }
    }

    const salesRequest = {
      metodo_pago: resolvedType,
      direccion,
      fecha: formatSalesFecha(new Date()),
      total,
    }

    const created = await postManagementSalesSafe({
      token: tokenAccess,
      metodoPago: salesRequest.metodo_pago,
      direccion: salesRequest.direccion,
      total: salesRequest.total,
      fecha: salesRequest.fecha,
    })

    if (!created.success) {
      return {
        success: false,
        error: created.error || 'No se pudo crear el pedido',
        needsAuth: created.needsAuth,
      }
    }

    // Pedido creado en servidor: vaciar carrito API (best effort).
    const cleared = await clearCartMassiveSafe({ token: tokenAccess })
    if (!cleared.success) {
      console.error('[checkout] Pedido creado pero no se pudo vaciar el carrito', cleared.error)
    }

    const order = buildCheckoutOrder({
      cartItems,
      userId: currentUserId,
      clientData,
      paymentType,
      paymentDetails,
      salesRequest: created.request ?? salesRequest,
      salesResponse: created.sale,
    })

    commitCart([])
    setCartCheckoutStep(0)
    events.emit(APP_EVENTS.ORDER_CREATED, { order })

    return {
      success: true,
      order,
      sale: created.sale,
      cartCleared: Boolean(cleared.success),
    }
  }, [cartItems, commitCart, currentUserId, events, tokenAccess])

  const initiateCheckout = useCallback(() => {
    if (cartItems.length === 0) {
      return { success: false, reason: 'empty' }
    }

    if (!authUsername) {
      events.emit(APP_EVENTS.AUTH_REQUIRED, { pending: 'checkout' })
      return { success: false, needsAuth: true }
    }

    setCartCheckoutStep(1)
    return { success: true }
  }, [cartItems, authUsername, events])

  const value = useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    setCartItemQuantity,
    clearCart,
    refreshCartFromApi,
    initiateCheckout,
    createOrderFromCheckout,
    cartCheckoutStep,
    setCartCheckoutStep,
    orderingProductIds,
    isOrderingProduct,
  }), [
    cartItems,
    addToCart,
    removeFromCart,
    setCartItemQuantity,
    clearCart,
    refreshCartFromApi,
    initiateCheckout,
    createOrderFromCheckout,
    cartCheckoutStep,
    orderingProductIds,
    isOrderingProduct,
  ])

  return {
    cartItems,
    setCartItems,
    commitCart,
    applyCartFromApi,
    applyCartFromPayload,
    refreshCartFromApi,
    addToCart,
    removeFromCart,
    setCartItemQuantity,
    clearCart,
    initiateCheckout,
    createOrderFromCheckout,
    cartCheckoutStep,
    setCartCheckoutStep,
    cartHydratingRef,
    orderingProductIds,
    isOrderingProduct,
    value,
  }
}
