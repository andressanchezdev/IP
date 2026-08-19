import { useCallback, useMemo, useRef, useState } from 'react'
import { buildCheckoutOrder } from '@/features/orders/utils/buildCheckoutOrder'
import { getCart } from '@/features/cart/api/cartApi'
import { persistCartItemSafe, removeCartItemSafe, clearCartMassiveSafe } from '@/features/cart/api/cartApiSafe'
import { mapApiCartItems } from '@/features/catalog/mappers/mapCartItems'
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
    const apiCart = mapApiCartItems(carritos).map(normalizeCartItem)
    setCartItems(apiCart)
    return apiCart
  }, [])

  const applyCartFromPayload = useCallback((carritos = []) => {
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

  const persistCartItemToApi = useCallback(
    (payload) => persistCartItemSafe({ token: tokenAccess, ...payload }),
    [tokenAccess],
  )

  const removeCartItemFromApi = useCallback(
    (idCarrito) => removeCartItemSafe({ token: tokenAccess, idCarrito }),
    [tokenAccess],
  )

  const addToCart = useCallback(async (productId, quantity = 1) => {
    if (!tokenAccess) {
      events.emit(APP_EVENTS.AUTH_REQUIRED, { pending: 'checkout' })
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
  }, [tokenAccess, events, persistCartItemToApi, productsRef, refreshCartFromApi])

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

    // Una petición massive; el WS aplica stock (stock eliminarTodo).
    const cleared = await clearCartMassiveSafe({ token: tokenAccess })
    if (!cleared.success) {
      return cleared
    }

    commitCart([])
    return { success: true }
  }, [tokenAccess, commitCart])

  const createOrderFromCheckout = useCallback(({ clientData, paymentType, paymentDetails }) => {
    if (cartItems.length === 0 || !currentUserId) {
      return
    }

    const order = buildCheckoutOrder({
      cartItems,
      userId: currentUserId,
      clientData,
      paymentType,
      paymentDetails,
    })

    commitCart([])
    setCartCheckoutStep(0)
    // Orders y UI reaccionan al evento (card en espera + cierre del drawer).
    events.emit(APP_EVENTS.ORDER_CREATED, { order })
  }, [cartItems, commitCart, currentUserId, events])

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
    value,
  }
}
