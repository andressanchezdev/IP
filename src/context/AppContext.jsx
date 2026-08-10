import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadPersistedState, savePersistedState, clearExpiredStorage, clearAppCache } from '../utils/storage'
import { mockProducts } from '../features/landing/data/mockProducts'
import { ORDER_STEPS } from '../features/landing/constants/orderSteps'
import { enrichOrder } from '../features/landing/utils/enrichOrder'
import { mockProfile, defaultProfileSettings } from '../features/landing/data/mockProfile'
import {
  clearAuthSession,
  findUserCredentials,
  loadAuthSession,
  registerUser,
  saveAuthSession,
} from '../features/auth/utils/authStorage'
import {
  getOrCreateUserWorkspace,
  persistUserWorkspace,
} from '../features/auth/utils/userWorkspace'
import { PAYMENT_METHOD_LABELS } from '../features/landing/constants/paymentConfig'

import { getBrandLogoUrl, withBrandLogo } from '../utils/brandLogos'

const defaultProducts = mockProducts.map((product) => ({
  ...withBrandLogo(product),
  stock: product.stock ?? 5,
}))

function normalizeCartItem(item) {
  return {
    ...item,
    brandLogo: getBrandLogoUrl(item.brand),
  }
}

function normalizeProduct(product) {
  return withBrandLogo(product)
}

function loadInitialUserData(session) {
  if (!session?.userId) {
    return {
      profileSettings: loadPersistedState('profileSettings', defaultProfileSettings),
      pendingOrders: [],
      historyOrders: [],
      cartItems: loadPersistedState('cart', []).map(normalizeCartItem),
    }
  }

  const credentials = findUserCredentials(session.username)
  const profile = credentials?.profile ?? defaultProfileSettings
  const workspace = getOrCreateUserWorkspace(session.userId, profile)

  return {
    profileSettings: workspace.profileSettings ?? profile,
    pendingOrders: workspace.pendingOrders ?? [],
    historyOrders: workspace.historyOrders ?? [],
    cartItems: (workspace.cart ?? []).map(normalizeCartItem),
  }
}

const PROFILE_SETTINGS_TTL = 365 * 24 * 60 * 60 * 1000

export const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [authSession, setAuthSession] = useState(() => loadAuthSession())
  const initialUserData = useMemo(() => loadInitialUserData(authSession), [])

  const [products, setProducts] = useState(() =>
    loadPersistedState('products', defaultProducts).map(normalizeProduct),
  )
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
  productsRef.current = products
  cartItemsRef.current = cartItems

  const isAuthenticated = Boolean(authSession?.username)
  const currentUserId = authSession?.userId ?? null

  useEffect(() => {
    if (!currentUserId) {
      return
    }

    persistUserWorkspace(currentUserId, {
      profileSettings,
      pendingOrders,
      historyOrders,
      cart: cartItems,
    })
  }, [currentUserId, profileSettings, pendingOrders, historyOrders, cartItems])

  useEffect(() => {
    savePersistedState('profileSettings', profileSettings, PROFILE_SETTINGS_TTL)
  }, [profileSettings])

  useEffect(() => {
    savePersistedState('products', products)
  }, [products])

  useEffect(() => {
    if (!currentUserId) {
      savePersistedState('cart', cartItems)
    }
  }, [cartItems, currentUserId])

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

  const addToCart = useCallback((productId, quantity = 1) => {
    if (quantity <= 0) {
      return
    }

    const product = productsRef.current.find((item) => item.id === productId)
    if (!product || product.stock <= 0) {
      return
    }

    const orderQuantity = Math.min(quantity, product.stock)

    setProducts((currentProducts) =>
      currentProducts.map((item) =>
        item.id === productId ? { ...item, stock: item.stock - orderQuantity } : item,
      ),
    )

    setCartItems((currentItems) => {
      const existing = currentItems.find((item) => item.id === productId)
      if (existing) {
        return currentItems.map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + orderQuantity } : item,
        )
      }

      return [...currentItems, { ...normalizeCartItem(product), quantity: orderQuantity }]
    })
  }, [])

  const removeFromCart = useCallback((productId) => {
    const item = cartItemsRef.current.find((entry) => entry.id === productId)
    if (!item) {
      return
    }

    setCartItems((currentItems) => currentItems.filter((entry) => entry.id !== productId))
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId ? { ...product, stock: product.stock + item.quantity } : product,
      ),
    )
  }, [])

  const setCartItemQuantity = useCallback((productId, quantity) => {
    const target = cartItemsRef.current.find((item) => item.id === productId)
    if (!target) {
      return
    }

    const product = productsRef.current.find((item) => item.id === productId)
    const totalAvailable = (product?.stock ?? 0) + target.quantity
    const nextQuantity = Math.max(1, Math.min(quantity, totalAvailable))
    const delta = nextQuantity - target.quantity

    if (delta === 0) {
      return
    }

    setCartItems((currentItems) =>
      currentItems.map((item) => (item.id === productId ? { ...item, quantity: nextQuantity } : item)),
    )
    setProducts((currentProducts) =>
      currentProducts.map((item) =>
        item.id === productId ? { ...item, stock: item.stock - delta } : item,
      ),
    )
  }, [])

  const clearCart = useCallback(() => {
    setCartItems([])
    setProducts((currentProducts) => currentProducts.map((product) => ({ ...product, stock: product.stock ?? 5 })))
  }, [])

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
    setCartItems([])
    setCartCheckoutStep(0)
    setActiveView('espera')
    setDrawerOpen(false)
    resetOrderDrawer()
  }, [cartItems, currentUserId, resetOrderDrawer])

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
    ...mockProfile,
    id: profileSettings.personal.userId,
    fullName: profileSettings.personal.fullName,
    addresses: mockProfile.addresses,
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
    setProducts(defaultProducts)
    setCartItems([])
    setPendingOrders([])
    setHistoryOrders([])
    setFilters({ brands: [], categories: [], models: [] })
    setSearchValue('')
  }, [])

  const deleteAccount = useCallback(() => {
    clearAppCache()
    clearAuthSession()
    setAuthSession(null)
    savePersistedState('profileSettings', defaultProfileSettings, PROFILE_SETTINGS_TTL)
    setProfileSettings(defaultProfileSettings)
    setProducts(defaultProducts)
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
    setCartItems((workspace.cart ?? []).map(normalizeCartItem))

    return {
      username: credentials.username,
      userId,
      loggedInAt: new Date().toISOString(),
    }
  }, [])

  const login = useCallback(({ username, password, rememberMe }) => {
    const credentials = findUserCredentials(username)

    if (!credentials || credentials.password !== password) {
      return { success: false, error: 'Usuario o contraseña incorrectos' }
    }

    const session = applyUserWorkspace(credentials)

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
  }, [applyUserWorkspace, pendingCheckout, pendingEsperaView])

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
        cart: cartItems,
      })
    }

    clearAuthSession()
    setAuthSession(null)
    setProfileSettings(defaultProfileSettings)
    setPendingOrders([])
    setHistoryOrders([])
    setCartItems([])
    setActiveView('tienda')
    setDrawerOpen(false)
    resetOrderDrawer()
  }, [cartItems, currentUserId, historyOrders, pendingOrders, profileSettings, resetOrderDrawer])

  const value = useMemo(() => ({
    products,
    cartItems,
    pendingOrders,
    historyOrders,
    activeView,
    setActiveView,
    navigateToView,
    drawerOpen,
    drawerType,
    openDrawer,
    closeDrawer,
    addToCart,
    removeFromCart,
    setCartItemQuantity,
    clearCart,
    initiateCheckout,
    createOrderFromCheckout,
    cartCheckoutStep,
    setCartCheckoutStep,
    pendingCheckout,
    pendingEsperaView,
    selectedOrderId,
    selectedOrder,
    orderSubView,
    setOrderSubView,
    openOrderDrawer,
    formalizeOrderPayment,
    profile,
    profileSettings,
    saveProfilePersonal,
    saveProfileCompany,
    saveProfileAccess,
    setNotificationsEnabled,
    releaseAppCache,
    deleteAccount,
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
    isAuthenticated,
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    switchAuthModalMode,
    login,
    register,
    logout,
  }), [
    products,
    cartItems,
    pendingOrders,
    historyOrders,
    activeView,
    navigateToView,
    drawerOpen,
    drawerType,
    openDrawer,
    closeDrawer,
    addToCart,
    removeFromCart,
    setCartItemQuantity,
    clearCart,
    initiateCheckout,
    createOrderFromCheckout,
    cartCheckoutStep,
    setCartCheckoutStep,
    pendingCheckout,
    pendingEsperaView,
    selectedOrderId,
    selectedOrder,
    orderSubView,
    openOrderDrawer,
    formalizeOrderPayment,
    profile,
    profileSettings,
    saveProfilePersonal,
    saveProfileCompany,
    saveProfileAccess,
    setNotificationsEnabled,
    releaseAppCache,
    deleteAccount,
    filters,
    clearFilters,
    filterNuevos,
    setFilterNuevos,
    filterPromociones,
    setFilterPromociones,
    withStock,
    setWithStock,
    searchValue,
    isAuthenticated,
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    switchAuthModalMode,
    login,
    register,
    logout,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
