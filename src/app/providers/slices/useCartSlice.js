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
  const [mutatingQtyIds, setMutatingQtyIds] = useState(() => new Set())
  const [isClearingCart, setIsClearingCart] = useState(false)
  const cartItemsRef = useRef(cartItems)
  const orderingIdsRef = useRef(new Set())
  const mutatingQtyRef = useRef(new Set())
  const clearingCartRef = useRef(false)
  const cartSyncGenRef = useRef(0)
  const internalHydratingRef = useRef(false)
  const cartHydratingRef = cartHydratingRefProp ?? internalHydratingRef
  cartItemsRef.current = cartItems

  const syncOrderingProductIds = useCallback(() => {
    setOrderingProductIds(new Set(orderingIdsRef.current))
  }, [])

  const syncMutatingQtyIds = useCallback(() => {
    setMutatingQtyIds(new Set(mutatingQtyRef.current))
  }, [])

  const hasInFlightCartMutation = useCallback(() => (
    orderingIdsRef.current.size > 0
    || mutatingQtyRef.current.size > 0
    || clearingCartRef.current
  ), [])

  const isOrderingProduct = useCallback((productId) => (
    orderingIdsRef.current.has(String(productId))
    || orderingProductIds.has(String(productId))
  ), [orderingProductIds])

  const isMutatingCartQty = useCallback((productId) => (
    mutatingQtyRef.current.has(String(productId))
    || mutatingQtyIds.has(String(productId))
  ), [mutatingQtyIds])

  // Authenticated cart is API-driven. commitCart only updates React state (no localStorage).
  const commitCart = useCallback((updater) => {
    setCartItems((currentItems) => (
      typeof updater === 'function' ? updater(currentItems) : updater
    ))
  }, [])

  /** Upsert por id de producto: no borrar otros ítems si el API devolvió solo 1 línea. */
  const mergeCartFromApiRows = useCallback((currentItems, carritos = []) => {
    const incoming = enrichCartItemsFiscalFromCatalog(
      mapApiCartItems(carritos).map(normalizeCartItem),
      productsRef.current,
    )
    if (incoming.length === 0) {
      return currentItems
    }

    const byId = new Map()
    for (const item of currentItems) {
      byId.set(String(item.id), item)
    }
    for (const item of incoming) {
      const key = String(item.id)
      const prev = byId.get(key)
      byId.set(key, prev ? normalizeCartItem({ ...prev, ...item }) : item)
    }
    return Array.from(byId.values())
  }, [productsRef])

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

  const refreshCartFromApi = useCallback(async ({ forceReplace = false } = {}) => {
    const token = tokenAccess
    if (!token) {
      return { success: false, error: 'Sin sesión' }
    }

    const gen = ++cartSyncGenRef.current

    try {
      cartHydratingRef.current = true
      const { carritos } = await getCart({ token })
      // Respuesta vieja o hay mutaciones en vuelo: no pisar UI optimista.
      if (gen !== cartSyncGenRef.current) {
        return { success: true, stale: true }
      }
      if (!forceReplace && hasInFlightCartMutation()) {
        setCartItems((current) => mergeCartFromApiRows(current, carritos))
        return { success: true, cartItems: cartItemsRef.current, merged: true }
      }
      const apiCart = enrichCartItemsFiscalFromCatalog(
        mapApiCartItems(carritos).map(normalizeCartItem),
        productsRef.current,
      )
      setCartItems(apiCart)
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
  }, [tokenAccess, hasInFlightCartMutation, mergeCartFromApiRows, productsRef])

  /**
   * POST/PUT suelen devolver 1 línea (o lista parcial). Siempre MERGE.
   * GET completo solo cuando no hay mutaciones en vuelo.
   */
  const syncCartAfterMutation = useCallback((mutationResult, { allowEmpty = false } = {}) => {
    const carritos = mutationResult?.carritos
    if (Array.isArray(carritos) && carritos.length > 0) {
      setCartItems((current) => mergeCartFromApiRows(current, carritos))
      return Promise.resolve({ success: true, from: 'merge' })
    }
    if (allowEmpty && Array.isArray(carritos) && carritos.length === 0) {
      // DELETE: ya aplicamos optimista; no vaciar el resto del carrito.
      return Promise.resolve({ success: true, from: 'optimistic' })
    }
    if (hasInFlightCartMutation()) {
      return Promise.resolve({ success: true, from: 'skip-refresh' })
    }
    void refreshCartFromApi()
    return Promise.resolve({ success: true, from: 'background' })
  }, [mergeCartFromApiRows, hasInFlightCartMutation, refreshCartFromApi])

  /** Cuando terminan todos los Ordenar/PUT, un GET de reconciliación. */
  const scheduleIdleCartRefresh = useCallback(() => {
    queueMicrotask(() => {
      if (hasInFlightCartMutation()) return
      void refreshCartFromApi({ forceReplace: true })
    })
  }, [hasInFlightCartMutation, refreshCartFromApi])

  const persistCartItemToApi = useCallback(
    (payload) => persistCartItemSafe({ token: tokenAccess, ...payload }),
    [tokenAccess],
  )

  const removeCartItemFromApi = useCallback(
    (idCarrito) => removeCartItemSafe({ token: tokenAccess, idCarrito }),
    [tokenAccess],
  )

  const addToCart = useCallback(async (productId, quantity = 1, sourceProduct = null, options = {}) => {
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

    orderingIdsRef.current.add(orderKey)
    syncOrderingProductIds()

    try {
    const listed = productsRef.current.find((item) => String(item.id) === orderKey)
    const sourceId = sourceProduct
      ? String(sourceProduct.id ?? sourceProduct.id_producto ?? '')
      : ''
    const sourceMatches = Boolean(sourceProduct && (!sourceId || sourceId === String(productId)))
    // Catálogo listado + fuente del chat: no perder fiscales al preferir la fila del bot.
    const product = listed && sourceMatches
      ? {
          ...listed,
          ...sourceProduct,
          id: listed.id ?? sourceProduct.id,
          stock: sourceProduct.stock ?? listed.stock,
          precio: sourceProduct.precio ?? sourceProduct.price ?? listed.precio ?? listed.price,
          price: sourceProduct.precio ?? sourceProduct.price ?? listed.price ?? listed.precio,
          compra: sourceProduct.compra ?? listed.compra,
          iva: sourceProduct.iva ?? listed.iva,
          exento: sourceProduct.exento ?? listed.exento,
          aplicacion: sourceProduct.aplicacion ?? listed.aplicacion,
        }
      : (sourceMatches ? sourceProduct : listed)
    if (!product) {
      return { success: false, error: 'Sin stock disponible' }
    }

    let existing = cartItemsRef.current.find((item) => String(item.id) === orderKey)
    let cartId = existing?.cartId ?? null

    // Si la línea ya existe pero sin id_carrito, un GET evita POST 400.
    if (existing && (cartId == null || cartId === '')) {
      try {
        const { carritos } = await getCart({ token: tokenAccess })
        const fromApi = mapApiCartItems(carritos).find((item) => String(item.id) === orderKey)
        commitCart((current) => mergeCartFromApiRows(current, carritos))
        if (fromApi?.cartId != null && fromApi.cartId !== '') {
          existing = { ...existing, ...fromApi }
          cartId = fromApi.cartId
        }
      } catch {
        // Seguir: sin cartId no se puede PUT ni POST seguro.
      }
    }

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

    if (existing && (cartId == null || cartId === '')) {
      return {
        success: false,
        error: 'Producto ya en carrito; no se pudo obtener id_carrito para actualizar',
      }
    }

    // UI inmediata mientras llega la mutación.
    if (existing) {
      commitCart((items) => items.map((item) => (
        String(item.id) === orderKey
          ? { ...item, quantity: planned.body.cantidad }
          : item
      )))
    } else {
      commitCart((items) => [
        ...items,
        normalizeCartItem({
          ...product,
          id: orderKey,
          quantity: planned.body.cantidad,
          price: planned.body.precio_unitario,
          compra: planned.body.compra,
          iva: planned.body.iva,
          exento: planned.body.exento,
          aplicacion: planned.body.aplicacion,
        }),
      ])
    }

    options?.onOptimistic?.({ productId: orderKey, quantity: planned.body.cantidad })

      // Ya en carrito → PUT. Nuevo → POST.
      const persisted = cartId
        ? await updateCartItemSafe({
            token: tokenAccess,
            idCarrito: cartId,
            productId: planned.body.id_producto,
            cantidad: planned.body.cantidad,
            precioUnitario: planned.body.precio_unitario,
            compra: planned.body.compra,
            exento: planned.body.exento,
            iva: planned.body.iva,
            aplicacion: planned.body.aplicacion,
            fecha: planned.body.fecha,
            product: product ?? existing,
          })
        : await persistCartItemToApi({
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
        if (existing) {
          commitCart((items) => items.map((item) => (
            String(item.id) === orderKey
              ? { ...item, quantity: previousQty }
              : item
          )))
        } else {
          commitCart((items) => items.filter((item) => String(item.id) !== orderKey))
        }
        return persisted
      }

      await syncCartAfterMutation(persisted)
      return { success: true, quantity: planned.body.cantidad, previousQty, request: planned.body }
    } finally {
      orderingIdsRef.current.delete(orderKey)
      syncOrderingProductIds()
      scheduleIdleCartRefresh()
    }
  }, [tokenAccess, events, persistCartItemToApi, productsRef, syncCartAfterMutation, syncOrderingProductIds, commitCart, scheduleIdleCartRefresh, mergeCartFromApiRows])

  const removeFromCart = useCallback(async (productId, options = {}) => {
    if (!tokenAccess) {
      return { success: false, needsAuth: true, error: 'Sesión requerida' }
    }

    const item = cartItemsRef.current.find((entry) => String(entry.id) === String(productId))
    if (!item) {
      return { success: false }
    }

    const removeKey = String(productId)
    if (mutatingQtyRef.current.has(removeKey) || orderingIdsRef.current.has(removeKey)) {
      return { success: false, duplicate: true, error: 'Procesando…' }
    }

    mutatingQtyRef.current.add(removeKey)
    syncMutatingQtyIds()
    const previousItems = cartItemsRef.current
    commitCart((items) => items.filter((entry) => String(entry.id) !== String(productId)))
    options?.onOptimistic?.({ productId: removeKey })

    try {
      const removed = await removeCartItemFromApi(item.cartId)
      if (!removed.success) {
        commitCart(previousItems)
        return removed
      }

      await syncCartAfterMutation(removed, { allowEmpty: true })
      return { success: true }
    } finally {
      mutatingQtyRef.current.delete(removeKey)
      syncMutatingQtyIds()
      scheduleIdleCartRefresh()
    }
  }, [tokenAccess, syncCartAfterMutation, removeCartItemFromApi, commitCart, syncMutatingQtyIds, scheduleIdleCartRefresh])

  /**
   * Actualiza cantidad vía PUT /api/v1/inventory/carts
   * Body: { id_carrito, id_producto, cantidad, precio_unitario, ...fiscales }
   */
  const setCartItemQuantity = useCallback(async (productId, quantity) => {
    if (!tokenAccess) {
      return { success: false, needsAuth: true, error: 'Sesión requerida' }
    }

    const target = cartItemsRef.current.find((item) => String(item.id) === String(productId))
    if (!target) {
      return { success: false, error: 'Ítem no encontrado' }
    }

    if (target.cartId == null || target.cartId === '') {
      return { success: false, error: 'id_carrito no disponible' }
    }

    const qtyKey = String(productId)
    if (mutatingQtyRef.current.has(qtyKey)) {
      return { success: false, duplicate: true, error: 'Actualizando cantidad…' }
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
    const fiscalSource = product ?? target

    mutatingQtyRef.current.add(qtyKey)
    syncMutatingQtyIds()
    // UI inmediata: cantidad local antes del PUT.
    commitCart((items) => items.map((item) => (
      String(item.id) === String(productId)
        ? { ...item, quantity: nextQuantity }
        : item
    )))

    try {
      const updated = await updateCartItemSafe({
        token: tokenAccess,
        idCarrito: target.cartId,
        productId: idProducto,
        cantidad: nextQuantity,
        precioUnitario,
        product: fiscalSource,
      })

      if (!updated.success) {
        commitCart((items) => items.map((item) => (
          String(item.id) === String(productId)
            ? { ...item, quantity: previousQty }
            : item
        )))
        return {
          success: false,
          error: updated.error || 'No se pudo actualizar la cantidad',
          previousQty,
        }
      }

      await syncCartAfterMutation(updated)
      return {
        success: true,
        quantity: nextQuantity,
        previousQty,
        request: updated.request,
      }
    } finally {
      mutatingQtyRef.current.delete(qtyKey)
      syncMutatingQtyIds()
      scheduleIdleCartRefresh()
    }
  }, [tokenAccess, productsRef, syncCartAfterMutation, commitCart, syncMutatingQtyIds, scheduleIdleCartRefresh])

  const clearCart = useCallback(async () => {
    if (!tokenAccess) {
      commitCart([])
      return { success: true }
    }

    if (clearingCartRef.current) {
      return { success: false, duplicate: true, error: 'Limpiando carrito…' }
    }

    clearingCartRef.current = true
    setIsClearingCart(true)
    const previousItems = cartItemsRef.current
    // UI inmediata: vaciar ya; la API confirma después.
    commitCart([])

    try {
      const cleared = await clearCartMassiveSafe({ token: tokenAccess })
      if (!cleared.success) {
        commitCart(previousItems)
        return cleared
      }
      return { success: true }
    } finally {
      clearingCartRef.current = false
      setIsClearingCart(false)
    }
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
    mutatingQtyIds,
    isMutatingCartQty,
    isClearingCart,
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
    mutatingQtyIds,
    isMutatingCartQty,
    isClearingCart,
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
    mutatingQtyIds,
    isMutatingCartQty,
    isClearingCart,
    value,
  }
}
