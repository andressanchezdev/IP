import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  loadPersistedState,
  savePersistedState,
  flushPersistedState,
  clearExpiredStorage,
  clearAppCache,
} from '@/shared/lib/storage'
import { ORDER_STEPS } from '@/features/orders/constants/orderSteps'
import { enrichOrder } from '@/features/orders/utils/enrichOrder'
import {
  createEmptyProfileView,
  defaultProfileSettings,
} from '@/features/profile/data/profileDefaults'
import {
  clearAuthSession,
  findUserCredentials,
  loadAuthSession,
  registerUser,
  saveAuthSession,
} from '@/features/auth/utils/authStorage'
import {
  getOrCreateUserWorkspace,
  persistUserWorkspace,
} from '@/features/auth/utils/userWorkspace'
import { loginRequest } from '@/features/auth/api/authApi'
import {
  mergeApiProfileWithWorkspace,
  toAuthUserSummary,
} from '@/features/auth/utils/mapLoginUserToProfile'
import { getGeneral, PRODUCTS_PAGE_SIZE } from '@/features/catalog/api/generalApi'
import { deleteCartItem, getCart, postCartItem } from '@/features/cart/api/cartApi'
import { mapApiProducts } from '@/features/catalog/mappers/mapProduct'
import { mapApiCartItems } from '@/features/catalog/mappers/mapCartItems'
import { useStockWebSocket } from '@/features/catalog/ws/useStockWebSocket'
import { PAYMENT_METHOD_LABELS } from '@/features/orders/constants/paymentConfig'
import { getBrandLogoUrl } from '@/shared/lib/brandLogos'
import { clearApiAuthToken, setApiAuthToken } from '@/shared/api'
import {
  AuthContext,
  CartContext,
  OrdersContext,
  CatalogContext,
  ProfileContext,
  UiContext,
} from './storeContexts'
function normalizeCartItem(item) {
  return {
    ...item,
    brandLogo: item.brandLogo || item.brandLogoUrl || getBrandLogoUrl(item.brand),
    imageUrl: item.imageUrl || '',
  }
}

function normalizeProduct(product) {
  return {
    ...product,
    brandLogo: product.brandLogo || product.brandLogoUrl || getBrandLogoUrl(product.brand),
    imageUrl: product.imageUrl || '',
  }
}

function loadInitialUserData(session) {
  if (!session?.userId) {
    return {
      profileSettings: loadPersistedState('profileSettings', defaultProfileSettings),
      pendingOrders: [],
      historyOrders: [],
      // Carrito solo vía API (GET/POST). Sin datos locales.
      cartItems: [],
    }
  }

  // Prioridad: snapshot del login en sesión → workspace → registro local.
  const sessionProfile = session.profile
  const credentials = findUserCredentials(session.username)
  const seedProfile = sessionProfile ?? credentials?.profile ?? defaultProfileSettings
  const workspace = getOrCreateUserWorkspace(session.userId, seedProfile)
  const workspaceProfile = workspace.profileSettings ?? seedProfile

  const profileSettings = sessionProfile
    ? mergeApiProfileWithWorkspace(sessionProfile, workspaceProfile)
    : workspaceProfile

  return {
    profileSettings,
    pendingOrders: workspace.pendingOrders ?? [],
    historyOrders: workspace.historyOrders ?? [],
    cartItems: [],
  }
}

const PROFILE_SETTINGS_TTL = 365 * 24 * 60 * 60 * 1000

export function AppProvider({ children }) {
  const [authSession, setAuthSession] = useState(() => loadAuthSession())
  const initialUserData = useMemo(() => loadInitialUserData(authSession), [])

  const [products, setProducts] = useState([])
  const [lastProductId, setLastProductId] = useState(null)
  const [hasMoreProducts, setHasMoreProducts] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [cartItems, setCartItems] = useState(() => initialUserData.cartItems)
  const [pendingOrders, setPendingOrders] = useState(() => initialUserData.pendingOrders)
  const [historyOrders, setHistoryOrders] = useState(() => initialUserData.historyOrders)
  const [activeView, setActiveView] = useState('tienda')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerType, setDrawerType] = useState('cart')
  const [filters, setFilters] = useState({ brands: [], categories: [], models: [] })
  const [filterNuevos, setFilterNuevos] = useState(false)
  const [filterPromociones, setFilterPromociones] = useState(false)
  const [withStock, setWithStock] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [orderSubView, setOrderSubView] = useState(null)
  const [profileSettings, setProfileSettings] = useState(() => initialUserData.profileSettings)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('login')
  const [cartCheckoutStep, setCartCheckoutStep] = useState(0)
  const [pendingCheckout, setPendingCheckout] = useState(false)
  const [pendingEsperaView, setPendingEsperaView] = useState(false)
  const productsRef = useRef(products)
  const cartItemsRef = useRef(cartItems)
  const productsLoadingRef = useRef(false)
  const cartHydratingRef = useRef(false)
  const currentUserIdRef = useRef(null)
  const warehouseIdRef = useRef(null)
  productsRef.current = products
  cartItemsRef.current = cartItems
  currentUserIdRef.current = authSession?.userId ?? null
  warehouseIdRef.current = profileSettings?.personal?.warehouseId ?? null

  const isAuthenticated = Boolean(authSession?.username)
  const currentUserId = authSession?.userId ?? null

  // Authenticated cart is API-driven. commitCart only updates React state (no localStorage).
  const commitCart = useCallback((updater) => {
    setCartItems((currentItems) => (
      typeof updater === 'function' ? updater(currentItems) : updater
    ))
  }, [])

  useEffect(() => {
    if (authSession?.tokenAccess) {
      setApiAuthToken(authSession.tokenAccess)
    } else {
      clearApiAuthToken()
    }
  }, [authSession?.tokenAccess])

  // WS independiente del carrito API: solo actualiza stock de productos en catálogo.
  useStockWebSocket({
    enabled: Boolean(authSession?.tokenAccess && authSession?.userId),
    setProducts,
    preferredWarehouseIdRef: warehouseIdRef,
  })

  const mergeUniqueProducts = useCallback((currentProducts, incomingProducts) => {
    if (!incomingProducts.length) {
      return { merged: currentProducts, addedCount: 0 }
    }

    const seen = new Set(currentProducts.map((product) => String(product.id)))
    const uniqueIncoming = incomingProducts.filter((product) => {
      const id = String(product.id)
      if (seen.has(id)) {
        return false
      }
      seen.add(id)
      return true
    })

    return {
      merged: [...currentProducts, ...uniqueIncoming],
      addedCount: uniqueIncoming.length,
    }
  }, [])

  const applyCartFromApi = useCallback(async ({ token }) => {
    const { carritos } = await getCart({ token })
    // Carrito = solo respuesta API. El stock de venta se lee del catálogo (API inicial + WS).
    const apiCart = mapApiCartItems(carritos).map(normalizeCartItem)
    setCartItems(apiCart)
    return apiCart
  }, [])

  const fetchProductsPage = useCallback(async ({
    token,
    lastId = null,
    replace = false,
    includeCart = false,
  }) => {
    const result = await getGeneral({
      token,
      lastId,
      limit: PRODUCTS_PAGE_SIZE,
    })

    const mappedProducts = mapApiProducts(result.productos).map(normalizeProduct)
    const cursor = result.nextCursor ?? result.lastId ?? null

    if (replace) {
      setProducts(mappedProducts)
      setLastProductId(cursor)
      setHasMoreProducts(result.hasMore)

      if (includeCart) {
        await applyCartFromApi({ token })
      }

      return {
        mappedProducts,
        addedCount: mappedProducts.length,
        hasMore: result.hasMore,
        lastId: cursor,
      }
    }

    const { merged, addedCount } = mergeUniqueProducts(productsRef.current, mappedProducts)
    setProducts(merged)
    setLastProductId(cursor)
    const hasMore = result.hasMore && addedCount > 0
    setHasMoreProducts(hasMore)

    return {
      mappedProducts,
      addedCount,
      hasMore,
      lastId: cursor,
    }
  }, [applyCartFromApi, mergeUniqueProducts])

  const loadMoreProducts = useCallback(async () => {
    const token = authSession?.tokenAccess
    if (!token || !hasMoreProducts || productsLoadingRef.current || lastProductId == null) {
      return { success: false }
    }

    productsLoadingRef.current = true
    setIsLoadingProducts(true)

    try {
      const result = await fetchProductsPage({
        token,
        lastId: lastProductId,
        replace: false,
      })
      return { success: true, ...result }
    } catch (error) {
      setHasMoreProducts(false)
      return {
        success: false,
        error: error?.message || 'No se pudieron cargar más productos',
      }
    } finally {
      productsLoadingRef.current = false
      setIsLoadingProducts(false)
    }
  }, [authSession?.tokenAccess, fetchProductsPage, hasMoreProducts, lastProductId])

  const refreshCartFromApi = useCallback(async () => {
    const token = authSession?.tokenAccess
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
  }, [applyCartFromApi, authSession?.tokenAccess])

  useEffect(() => {
    let cancelled = false

    async function hydrateFromApiSession() {
      if (!authSession?.tokenAccess || !authSession?.userId) {
        return
      }

      productsLoadingRef.current = true
      cartHydratingRef.current = true
      setIsLoadingProducts(true)

      try {
        await fetchProductsPage({
          token: authSession.tokenAccess,
          lastId: null,
          replace: true,
          includeCart: true,
        })
      } catch (error) {
        if (!cancelled) {
          setHasMoreProducts(false)
          console.error('[hydrate] No se pudo cargar inventory/products + carts', error)
        }
      } finally {
        if (!cancelled) {
          productsLoadingRef.current = false
          cartHydratingRef.current = false
          setIsLoadingProducts(false)
        }
      }
    }

    hydrateFromApiSession()

    return () => {
      cancelled = true
    }
  }, [authSession?.tokenAccess, authSession?.userId, fetchProductsPage])

  useEffect(() => {
    if (!currentUserId) {
      return
    }

    persistUserWorkspace(currentUserId, {
      profileSettings,
      pendingOrders,
      historyOrders,
    })
  }, [currentUserId, profileSettings, pendingOrders, historyOrders])

  useEffect(() => {
    savePersistedState('profileSettings', profileSettings, PROFILE_SETTINGS_TTL)
  }, [profileSettings])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      clearExpiredStorage()
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  const resetOrderDrawer = useCallback(() => {
    setSelectedOrderId(null)
    setOrderSubView(null)
  }, [])

  const openDrawer = useCallback((type = 'cart') => {
    if (type !== 'order') {
      resetOrderDrawer()
    }
    setDrawerType(type)
    setDrawerOpen(true)
  }, [resetOrderDrawer])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setCartCheckoutStep(0)
    resetOrderDrawer()
  }, [resetOrderDrawer])

  const openOrderDrawer = useCallback((orderId) => {
    setSelectedOrderId(orderId)
    setDrawerType('order')
    setDrawerOpen(true)
  }, [])

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return null
    }

    const order = pendingOrders.find((entry) => entry.id === selectedOrderId)
      ?? historyOrders.find((entry) => entry.id === selectedOrderId)

    return enrichOrder(order)
  }, [selectedOrderId, pendingOrders, historyOrders])

  /**
   * Carrito solo por API: GET / POST / DELETE.
   * No modifica stock de productos; eso lo hace el WS por su cuenta.
   */
  const persistCartItemToApi = useCallback(async ({
    productId,
    cantidad,
    precioUnitario,
  }) => {
    const token = authSession?.tokenAccess
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
  }, [authSession?.tokenAccess])

  const removeCartItemFromApi = useCallback(async (idCarrito) => {
    const token = authSession?.tokenAccess
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
  }, [authSession?.tokenAccess])

  const addToCart = useCallback(async (productId, quantity = 1) => {
    if (!authSession?.tokenAccess) {
      setPendingCheckout(true)
      setAuthModalOpen(true)
      setAuthModalMode('login')
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
  }, [authSession?.tokenAccess, persistCartItemToApi, refreshCartFromApi])

  const removeFromCart = useCallback(async (productId) => {
    if (!authSession?.tokenAccess) {
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
  }, [authSession?.tokenAccess, refreshCartFromApi, removeCartItemFromApi])

  const setCartItemQuantity = useCallback(async (productId, quantity) => {
    if (!authSession?.tokenAccess) {
      return { success: false, needsAuth: true, error: 'Sesión requerida' }
    }

    const target = cartItemsRef.current.find((item) => String(item.id) === String(productId))
    if (!target) {
      return { success: false, error: 'Ítem no encontrado' }
    }

    const product = productsRef.current.find((item) => String(item.id) === String(productId))
    const catalogStock = Number(product?.stock) || 0
    const totalAvailable = catalogStock + (Number(target.quantity) || 0)
    const nextQuantity = Math.max(1, Math.min(quantity, totalAvailable || quantity))
    const previousQty = Number(target.quantity) || 0

    if (nextQuantity === previousQty) {
      return { success: true, quantity: nextQuantity, previousQty }
    }

    const unitPrice = Number(target.price ?? product?.price ?? product?.precio) || 0
    const persisted = await persistCartItemToApi({
      productId,
      cantidad: nextQuantity,
      precioUnitario: unitPrice,
    })
    if (!persisted.success) {
      return persisted
    }

    await refreshCartFromApi()
    return { success: true, quantity: nextQuantity, previousQty }
  }, [authSession?.tokenAccess, persistCartItemToApi, refreshCartFromApi])

  const clearCart = useCallback(async () => {
    if (!authSession?.tokenAccess) {
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
  }, [authSession?.tokenAccess, commitCart, refreshCartFromApi, removeCartItemFromApi])

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
  }, [cartItems, commitCart, currentUserId, resetOrderDrawer])

  const navigateToView = useCallback((view) => {
    if (view === 'espera' && !authSession?.username) {
      setPendingEsperaView(true)
      setAuthModalOpen(true)
      setAuthModalMode('login')
      return false
    }

    setActiveView(view)
    return true
  }, [authSession])

  const initiateCheckout = useCallback(() => {
    if (cartItems.length === 0) {
      return { success: false, reason: 'empty' }
    }

    if (!authSession?.username) {
      setPendingCheckout(true)
      setAuthModalOpen(true)
      setAuthModalMode('login')
      return { success: false, needsAuth: true }
    }

    setCartCheckoutStep(1)
    return { success: true }
  }, [cartItems, authSession])

  const clearFilters = useCallback(() => {
    setFilters({ brands: [], categories: [], models: [] })
    setFilterNuevos(false)
    setFilterPromociones(false)
    setWithStock(false)
    setSearchValue('')
  }, [])

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
      setDrawerOpen(false)
      setActiveView('historial')
      resetOrderDrawer()
    } else {
      setPendingOrders((currentOrders) =>
        currentOrders.map((entry) => (entry.id === orderId ? updatedOrder : entry)),
      )
      setOrderSubView(null)
    }

    return { success: true, isFullyPaid }
  }, [pendingOrders, resetOrderDrawer])

  const profile = useMemo(() => ({
    ...createEmptyProfileView(profileSettings),
    id: profileSettings.personal.userId,
    fullName: profileSettings.personal.fullName,
    documentId: profileSettings.personal.documentId,
    mobile: profileSettings.personal.mobile || profileSettings.personal.phone || '',
    phone: profileSettings.personal.phone || '',
    status: profileSettings.personal.role || '',
    addresses: profileSettings.addresses ?? [],
  }), [profileSettings])

  const saveProfilePersonal = useCallback((personal) => {
    setProfileSettings((current) => ({ ...current, personal }))
  }, [])

  const saveProfileCompany = useCallback((company) => {
    setProfileSettings((current) => ({ ...current, company }))
  }, [])

  const saveProfileAccess = useCallback((access) => {
    setProfileSettings((current) => ({ ...current, access }))
  }, [])

  const setNotificationsEnabled = useCallback((notificationsEnabled) => {
    setProfileSettings((current) => ({ ...current, notificationsEnabled }))
  }, [])

  const releaseAppCache = useCallback(() => {
    clearAppCache()
    setProducts([])
    setLastProductId(null)
    setHasMoreProducts(false)
    setCartItems([])
    setPendingOrders([])
    setHistoryOrders([])
    setFilters({ brands: [], categories: [], models: [] })
    setSearchValue('')
  }, [])

  const deleteAccount = useCallback(() => {
    clearAppCache()
    clearApiAuthToken()
    clearAuthSession()
    setAuthSession(null)
    savePersistedState('profileSettings', defaultProfileSettings, PROFILE_SETTINGS_TTL)
    setProfileSettings(defaultProfileSettings)
    setProducts([])
    setLastProductId(null)
    setHasMoreProducts(false)
    setCartItems([])
    setPendingOrders([])
    setHistoryOrders([])
    setFilters({ brands: [], categories: [], models: [] })
    setSearchValue('')
    setDrawerOpen(false)
    resetOrderDrawer()
  }, [resetOrderDrawer])

  const openAuthModal = useCallback((mode = 'login') => {
    setAuthModalMode(mode)
    setAuthModalOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false)
    setAuthModalMode('login')
    setPendingCheckout(false)
    setPendingEsperaView(false)
  }, [])

  const switchAuthModalMode = useCallback((mode) => {
    setAuthModalMode(mode)
  }, [])

  const applyUserWorkspace = useCallback((credentials) => {
    const userId = credentials.profile.personal.userId
    const workspace = getOrCreateUserWorkspace(userId, credentials.profile)

    setProfileSettings(workspace.profileSettings ?? credentials.profile)
    setPendingOrders(workspace.pendingOrders ?? [])
    setHistoryOrders(workspace.historyOrders ?? [])
    setCartItems([])

    return {
      username: credentials.username,
      userId,
      loggedInAt: new Date().toISOString(),
    }
  }, [])

  const login = useCallback(async ({ email, password, rememberMe, username }) => {
    const loginEmail = String(email ?? username ?? '').trim()

    try {
      const {
        tokenAccess,
        refreshToken,
        client,
        profileSettings: apiProfile,
      } = await loginRequest({
        email: loginEmail,
        password,
      })
      setApiAuthToken(tokenAccess)

      const userId = client.userId
      const workspace = getOrCreateUserWorkspace(userId, apiProfile)
      const nextProfile = mergeApiProfileWithWorkspace(
        apiProfile,
        workspace.profileSettings,
      )
      const authUser = toAuthUserSummary(nextProfile)

      cartHydratingRef.current = true
      // Datos personales siempre desde la respuesta de login (user.usuario).
      setProfileSettings(nextProfile)
      savePersistedState('profileSettings', nextProfile, PROFILE_SETTINGS_TTL)
      persistUserWorkspace(userId, {
        profileSettings: nextProfile,
        pendingOrders: workspace.pendingOrders ?? [],
        historyOrders: workspace.historyOrders ?? [],
      })
      setPendingOrders(workspace.pendingOrders ?? [])
      setHistoryOrders(workspace.historyOrders ?? [])
      setProducts([])
      setLastProductId(null)
      setHasMoreProducts(false)
      // Cart se hidrata solo desde GET /api/v1/inventory/carts (no localStorage).
      setCartItems([])

      const session = {
        username: client.email || loginEmail,
        email: client.email || loginEmail,
        userId,
        tokenAccess,
        refreshToken: refreshToken || null,
        displayName: client.fullName,
        documentId: client.documentId,
        mobile: client.mobile,
        role: client.role,
        user: authUser,
        profile: nextProfile,
        loggedInAt: new Date().toISOString(),
      }

      setAuthSession(session)
      saveAuthSession(session, rememberMe)
      setAuthModalOpen(false)
      setAuthModalMode('login')

      if (pendingCheckout) {
        setPendingCheckout(false)
        setCartCheckoutStep(1)
        setDrawerType('cart')
        setDrawerOpen(true)
      } else if (pendingEsperaView) {
        setPendingEsperaView(false)
        setActiveView('espera')
      }

      return { success: true }
    } catch (error) {
      clearApiAuthToken()
      cartHydratingRef.current = false
      setHasMoreProducts(false)
      return {
        success: false,
        error: error?.message || 'No se pudo iniciar sesión',
      }
    }
  }, [pendingCheckout, pendingEsperaView])

  const register = useCallback((formData) => {
    const result = registerUser(formData)

    if (!result.success) {
      return result
    }

    const session = applyUserWorkspace(result.user)

    setAuthSession(session)
    saveAuthSession(session, true)
    setAuthModalOpen(false)
    setAuthModalMode('login')

    if (pendingCheckout) {
      setPendingCheckout(false)
      setCartCheckoutStep(1)
      setDrawerType('cart')
      setDrawerOpen(true)
    } else if (pendingEsperaView) {
      setPendingEsperaView(false)
      setActiveView('espera')
    }

    return { success: true }
  }, [applyUserWorkspace, pendingCheckout, pendingEsperaView])

  const logout = useCallback(() => {
    if (currentUserId) {
      persistUserWorkspace(currentUserId, {
        profileSettings,
        pendingOrders,
        historyOrders,
      })
      flushPersistedState()
    }

    clearApiAuthToken()
    clearAuthSession()
    setAuthSession(null)
    setProfileSettings(defaultProfileSettings)
    setPendingOrders([])
    setHistoryOrders([])
    setCartItems([])
    setProducts([])
    setLastProductId(null)
    setHasMoreProducts(false)
    setFilters({ brands: [], categories: [], models: [] })
    setFilterNuevos(false)
    setFilterPromociones(false)
    setWithStock(false)
    setSearchValue('')
    setActiveView('tienda')
    setDrawerOpen(false)
    resetOrderDrawer()
  }, [currentUserId, historyOrders, pendingOrders, profileSettings, resetOrderDrawer])

  const authUser = useMemo(() => {
    if (!isAuthenticated) {
      return null
    }

    // profileSettings (mapeado del login) es la fuente de verdad en UI.
    const fromProfile = toAuthUserSummary(profileSettings)
    if (fromProfile.userId || fromProfile.fullName) {
      return fromProfile
    }

    return authSession?.user ?? null
  }, [authSession?.user, isAuthenticated, profileSettings])

  const authValue = useMemo(() => ({
    isAuthenticated,
    user: authUser,
    userId: authUser?.userId || currentUserId,
    displayName: authUser?.fullName || authSession?.displayName || '',
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    switchAuthModalMode,
    login,
    register,
    logout,
    pendingCheckout,
    pendingEsperaView,
  }), [
    isAuthenticated,
    authUser,
    currentUserId,
    authSession?.displayName,
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    switchAuthModalMode,
    login,
    register,
    logout,
    pendingCheckout,
    pendingEsperaView,
  ])

  const cartValue = useMemo(() => ({
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

  const ordersValue = useMemo(() => ({
    pendingOrders,
    historyOrders,
    selectedOrderId,
    selectedOrder,
    orderSubView,
    setOrderSubView,
    openOrderDrawer,
    formalizeOrderPayment,
  }), [
    pendingOrders,
    historyOrders,
    selectedOrderId,
    selectedOrder,
    orderSubView,
    openOrderDrawer,
    formalizeOrderPayment,
  ])

  const catalogValue = useMemo(() => ({
    products,
    lastProductId,
    hasMoreProducts,
    isLoadingProducts,
    loadMoreProducts,
    filters,
    setFilters,
    clearFilters,
    filterNuevos,
    setFilterNuevos,
    filterPromociones,
    setFilterPromociones,
    withStock,
    setWithStock,
    searchValue,
    setSearchValue,
  }), [
    products,
    lastProductId,
    hasMoreProducts,
    isLoadingProducts,
    loadMoreProducts,
    filters,
    clearFilters,
    filterNuevos,
    filterPromociones,
    withStock,
    searchValue,
  ])

  const profileValue = useMemo(() => ({
    profile,
    profileSettings,
    saveProfilePersonal,
    saveProfileCompany,
    saveProfileAccess,
    setNotificationsEnabled,
    releaseAppCache,
    deleteAccount,
  }), [
    profile,
    profileSettings,
    saveProfilePersonal,
    saveProfileCompany,
    saveProfileAccess,
    setNotificationsEnabled,
    releaseAppCache,
    deleteAccount,
  ])

  const uiValue = useMemo(() => ({
    activeView,
    setActiveView,
    navigateToView,
    drawerOpen,
    drawerType,
    openDrawer,
    closeDrawer,
  }), [
    activeView,
    navigateToView,
    drawerOpen,
    drawerType,
    openDrawer,
    closeDrawer,
  ])

  return (
    <AuthContext.Provider value={authValue}>
      <CartContext.Provider value={cartValue}>
        <OrdersContext.Provider value={ordersValue}>
          <CatalogContext.Provider value={catalogValue}>
            <ProfileContext.Provider value={profileValue}>
              <UiContext.Provider value={uiValue}>
                {children}
              </UiContext.Provider>
            </ProfileContext.Provider>
          </CatalogContext.Provider>
        </OrdersContext.Provider>
      </CartContext.Provider>
    </AuthContext.Provider>
  )
}
