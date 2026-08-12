import { useCallback, useMemo, useRef, useState } from 'react'
import { ORDER_STEPS } from '@/features/orders/constants/orderSteps'
import { enrichOrder } from '@/features/orders/utils/enrichOrder'
import { PAYMENT_METHOD_LABELS } from '@/features/orders/constants/paymentConfig'
import { deleteCartItem, getCart, postCartItem } from '@/features/cart/api/cartApi'
import { mapApiCartItems } from '@/features/catalog/mappers/mapCartItems'
import { normalizeCartItem } from '../helpers'

export function useCartSlice({
  tokenAccess,
  productsRef,
  authUsername,
  openAuthForCart,
  setPendingCheckout,
  setActiveView,
  setDrawerOpen,
  setDrawerType: _setDrawerType,
  resetOrderDrawer,
  setPendingOrders,
  currentUserId,
  initialCartItems,
  cartHydratingRef: cartHydratingRefProp,
}) {
  const [cartItems, setCartItems] = useState(() => initialCartItems)
  const [cartCheckoutStep, setCartCheckoutStep] = useState(0)
  const cartItemsRef = useRef(cartItems)
  const internalHydratingRef = useRef(false)
  const cartHydratingRef = cartHydratingRefProp ?? internalHydratingRef
  cartItemsRef.current = cartItems

  // Authenticated cart is API-driven. commitCart only updates React state (no localStorage).
  const commitCart = useCallback((updater) => {
    setCartItems((currentItems) => (
      typeof updater === 'function' ? updater(currentItems) : updater
    ))
  }, [])

  const applyCartFromApi = useCallback(async ({ token }) => {
    const { carritos } = await getCart({ token })
    // Carrito = solo respuesta API. El stock de venta se lee del catálogo (API inicial + WS).
    const apiCart = mapApiCartItems(carritos).map(normalizeCartItem)
    setCartItems(apiCart)
    return apiCart
  }, [])

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

  /**
   * Carrito solo por API: GET / POST / DELETE.
   * No modifica stock de productos; eso lo hace el WS por su cuenta.
   */
  const persistCartItemToApi = useCallback(async ({
    productId,
    cantidad,
    precioUnitario,
  }) => {
    const token = tokenAccess
    if (!token) {
      return { success: false, error: 'Sesión requerida', needsAuth: true }
    }

    try {
      const result = await postCartItem({
        token,
        idProducto: productId,
        cantidad,
        precioUnitario,
      })
      return { success: true, ...result }
    } catch (error) {
      console.error('[cart] No se pudo guardar POST /api/v1/inventory/carts', error)
      return {
        success: false,
        error: error?.message || 'No se pudo guardar el carrito',
      }
    }
  }, [tokenAccess])

  const removeCartItemFromApi = useCallback(async (idCarrito) => {
    const token = tokenAccess
    if (!token) {
      return { success: false, error: 'Sesión requerida', needsAuth: true }
    }

    if (idCarrito == null || idCarrito === '') {
      return { success: false, error: 'id_carrito no disponible' }
    }

    try {
      const result = await deleteCartItem({
        token,
        idCarrito,
      })
      return { success: true, ...result }
    } catch (error) {
      console.error('[cart] No se pudo eliminar DELETE /api/v1/inventory/carts', error)
      return {
        success: false,
        error: error?.message || 'No se pudo eliminar del carrito',
      }
    }
  }, [tokenAccess])

  const addToCart = useCallback(async (productId, quantity = 1) => {
    if (!tokenAccess) {
      setPendingCheckout(true)
      openAuthForCart()
      return { success: false, needsAuth: true, error: 'Inicia sesión para agregar al carrito' }
    }

    if (quantity <= 0) {
      return { success: false, error: 'Cantidad inválida' }
    }

    const product = productsRef.current.find((item) => String(item.id) === String(productId))
    if (!product || product.stock <= 0) {
      return { success: false, error: 'Sin stock disponible' }
    }

    const orderQuantity = Math.min(quantity, product.stock)
    const existing = cartItemsRef.current.find((item) => String(item.id) === String(productId))
    const previousQty = existing ? Number(existing.quantity) || 0 : 0
    const nextQty = previousQty + orderQuantity
    const unitPrice = Number(existing?.price ?? product.price ?? product.precio) || 0

    const persisted = await persistCartItemToApi({
      productId,
      cantidad: nextQty,
      precioUnitario: unitPrice,
    })
    if (!persisted.success) {
      return persisted
    }

    await refreshCartFromApi()
    return { success: true, quantity: nextQty, previousQty }
  }, [tokenAccess, openAuthForCart, persistCartItemToApi, productsRef, refreshCartFromApi, setPendingCheckout])

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
   * Actualiza cantidad en la card existente (estado local).
   * No hace POST: el API crea otra fila/card si se vuelve a postear el mismo producto.
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

    commitCart((currentItems) => (
      currentItems.map((item) => (
        String(item.id) === String(productId)
          ? { ...item, quantity: nextQuantity }
          : item
      ))
    ))

    return { success: true, quantity: nextQuantity, previousQty }
  }, [tokenAccess, commitCart, productsRef])

  const clearCart = useCallback(async () => {
    if (!tokenAccess) {
      commitCart([])
      return { success: true }
    }

    const previousItems = [...cartItemsRef.current]
    for (const item of previousItems) {
      const removed = await removeCartItemFromApi(item.cartId)
      if (!removed.success) {
        await refreshCartFromApi()
        return removed
      }
    }

    await refreshCartFromApi()
    return { success: true }
  }, [tokenAccess, commitCart, refreshCartFromApi, removeCartItemFromApi])

  const createOrderFromCheckout = useCallback(({ clientData, paymentType, paymentDetails }) => {
    if (cartItems.length === 0 || !currentUserId) {
      return
    }

    const now = new Date()
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const total = Number(paymentDetails?.amount) || subtotal + Math.round(subtotal * 0.19)
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)
    const orderId = `PED-${Date.now()}`
    const methodLabel = PAYMENT_METHOD_LABELS[paymentType] ?? 'Efectivo'

    const order = enrichOrder({
      id: orderId,
      userId: currentUserId,
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

    setPendingOrders((currentOrders) => [order, ...currentOrders])
    commitCart([])
    setCartCheckoutStep(0)
    setActiveView('espera')
    setDrawerOpen(false)
    resetOrderDrawer()
  }, [
    cartItems,
    commitCart,
    currentUserId,
    resetOrderDrawer,
    setActiveView,
    setDrawerOpen,
    setPendingOrders,
  ])

  const initiateCheckout = useCallback(() => {
    if (cartItems.length === 0) {
      return { success: false, reason: 'empty' }
    }

    if (!authUsername) {
      setPendingCheckout(true)
      openAuthForCart()
      return { success: false, needsAuth: true }
    }

    setCartCheckoutStep(1)
    return { success: true }
  }, [cartItems, authUsername, openAuthForCart, setPendingCheckout])

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
  ])

  return {
    cartItems,
    setCartItems,
    commitCart,
    applyCartFromApi,
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
    value,
  }
}
