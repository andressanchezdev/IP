const PRICE_LIST_TITLES = {
  download: 'Método de descarga',
  brand: 'Marca a escoger',
  category: 'Categoría a escoger',
  model: 'Modelo a escoger',
}

export function getDrawerTitle({
  drawerType,
  cartMenuOpen,
  cartCheckoutStep,
  profileSubView,
  orderSubView,
  selectedOrder,
}) {
  if (drawerType === 'cart') {
    if (cartMenuOpen) {
      return 'Opciones'
    }
    if (cartCheckoutStep > 0) {
      return 'Finalizar'
    }
    return undefined
  }
  if (drawerType === 'profile') {
    if (profileSubView === 'settings') return 'Configuración'
    if (profileSubView === 'bulk-upload') return 'Subir nuevo archivo'
    if (profileSubView === 'price-download') return PRICE_LIST_TITLES.download
    if (profileSubView === 'price-brand') return PRICE_LIST_TITLES.brand
    if (profileSubView === 'price-category') return PRICE_LIST_TITLES.category
    if (profileSubView === 'price-model') return PRICE_LIST_TITLES.model
    return undefined
  }
  if (drawerType === 'order') {
    if (orderSubView === 'payments') {
      return 'Pagos'
    }
    return selectedOrder?.id
  }
  return undefined
}

export function getCloseAriaLabel({
  drawerType,
  cartMenuOpen,
  cartCheckoutStep,
  profileSubView,
  orderSubView,
}) {
  if (drawerType === 'cart' && cartMenuOpen) {
    return 'Volver al carrito'
  }
  if (drawerType === 'cart' && cartCheckoutStep > 0) {
    return 'Volver al carrito'
  }
  if (drawerType === 'profile' && profileSubView) {
    return 'Volver'
  }
  if (drawerType === 'order' && orderSubView) {
    return 'Volver al pedido'
  }
  return 'Cerrar panel'
}
