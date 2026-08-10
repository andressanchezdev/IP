import { useEffect, useState } from 'react'
import settingsIcon from '@/assets/icons/settings.svg'
import clearFilterIcon from '@/assets/icons/clear-filter.svg'
import { useCatalog, useOrders, useCart, useUi } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { Drawer, DrawerBackdrop } from '@/shared/ui/Drawer'
import { CartDrawerContent } from '@/features/cart/components/CartDrawer/CartDrawerContent'
import { CartCheckoutDrawerContent } from '@/features/cart/components/CartCheckout/CartCheckoutDrawerContent'
import { CartMenuDrawerContent } from '@/features/cart/components/CartMenu/CartMenuDrawerContent'
import { OrderDrawerContent } from '@/features/orders/components/OrderDrawer/OrderDrawerContent'
import { OrderPaymentsDrawerContent } from '@/features/orders/components/OrderPayments/OrderPaymentsDrawerContent'
import { FilterDrawerContent } from '@/features/catalog/components/FilterDrawer/FilterDrawerContent'
import { ProfileDrawerContent } from '@/features/profile/components/ProfileDrawer/ProfileDrawerContent'
import { ProfileSettingsDrawerContent } from '@/features/profile/components/ProfileSettings/ProfileSettingsDrawerContent'

export function AppDrawer() {
  const { clearFilters } = useCatalog()
  const {
    selectedOrder,
    selectedOrderId,
    orderSubView,
    setOrderSubView,
  } = useOrders()
  const { cartCheckoutStep, setCartCheckoutStep } = useCart()
  const {
    drawerOpen,
    drawerType,
    closeDrawer,
  } = useUi()
  const { showToast } = useToast()
  const [cartMenuOpen, setCartMenuOpen] = useState(false)
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false)
  const [orderOpenSections, setOrderOpenSections] = useState([])
  const [orderPackagingProductsOpen, setOrderPackagingProductsOpen] = useState(false)

  useEffect(() => {
    setOrderOpenSections([])
    setOrderPackagingProductsOpen(false)
  }, [selectedOrderId])

  useEffect(() => {
    if (!drawerOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [drawerOpen])

  useEffect(() => {
    if (!drawerOpen || drawerType !== 'cart') {
      setCartMenuOpen(false)
    }
  }, [drawerOpen, drawerType])

  useEffect(() => {
    if (!drawerOpen || drawerType !== 'profile') {
      setProfileSettingsOpen(false)
    }
  }, [drawerOpen, drawerType])

  const handleClose = () => {
    if (drawerType === 'cart' && cartMenuOpen) {
      setCartMenuOpen(false)
      return
    }
    if (drawerType === 'cart' && cartCheckoutStep > 0) {
      setCartCheckoutStep(0)
      return
    }
    if (drawerType === 'profile' && profileSettingsOpen) {
      setProfileSettingsOpen(false)
      return
    }
    if (drawerType === 'order' && !orderSubView && orderOpenSections.length > 0) {
      setOrderOpenSections([])
      setOrderPackagingProductsOpen(false)
      return
    }
    if (drawerType === 'order' && orderSubView) {
      setOrderSubView(null)
      return
    }
    closeDrawer()
  }

  const renderContent = () => {
    if (drawerType === 'cart') {
      if (cartMenuOpen) {
        return <CartMenuDrawerContent />
      }
      if (cartCheckoutStep > 0) {
        return <CartCheckoutDrawerContent />
      }
      return <CartDrawerContent />
    }
    if (drawerType === 'filter') {
      return <FilterDrawerContent />
    }
    if (drawerType === 'profile') {
      if (profileSettingsOpen) {
        return <ProfileSettingsDrawerContent />
      }
      return <ProfileDrawerContent />
    }
    if (drawerType === 'order') {
      if (orderSubView === 'payments') {
        return <OrderPaymentsDrawerContent />
      }
      return (
        <OrderDrawerContent
          openSections={orderOpenSections}
          onToggleSection={(sectionId) => {
            setOrderOpenSections((current) =>
              current.includes(sectionId)
                ? current.filter((id) => id !== sectionId)
                : [...current, sectionId],
            )
          }}
          onCloseSection={(sectionId) => {
            setOrderOpenSections((current) => current.filter((id) => id !== sectionId))
          }}
          packagingProductsOpen={orderPackagingProductsOpen}
          onTogglePackagingProducts={() => setOrderPackagingProductsOpen((open) => !open)}
        />
      )
    }
    return null
  }

  const drawerTitle = (() => {
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
      return profileSettingsOpen ? 'Configuración' : undefined
    }
    if (drawerType === 'order') {
      if (orderSubView === 'payments') {
        return 'Pagos'
      }
      return selectedOrder?.id
    }
    return undefined
  })()

  const closeAriaLabel = (() => {
    if (drawerType === 'cart' && cartMenuOpen) {
      return 'Volver al carrito'
    }
    if (drawerType === 'cart' && cartCheckoutStep > 0) {
      return 'Volver al carrito'
    }
    if (drawerType === 'profile' && profileSettingsOpen) {
      return 'Volver al perfil'
    }
    if (drawerType === 'order' && orderSubView) {
      return 'Volver al pedido'
    }
    return 'Cerrar panel'
  })()

  const headerActions = (() => {
    if (drawerType === 'cart' && !cartMenuOpen && cartCheckoutStep === 0) {
      return (
        <div className="drawer__actions">
          <button
            type="button"
            className="drawer__menu"
            onClick={() => setCartMenuOpen(true)}
            aria-label="Opciones del carrito"
          >
            ☰
          </button>
        </div>
      )
    }

    if (drawerType === 'profile' && !profileSettingsOpen) {
      return (
        <div className="drawer__actions">
          <button
            type="button"
            className="drawer__settings"
            onClick={() => setProfileSettingsOpen(true)}
            aria-label="Configuración del perfil"
          >
            <img src={settingsIcon} alt="" className="drawer__settings-icon" aria-hidden="true" />
          </button>
        </div>
      )
    }

    if (drawerType === 'filter') {
      return (
        <div className="drawer__actions">
          <button
            type="button"
            className="drawer__clear-filters"
            onClick={() => {
              clearFilters()
              showToast('Filtros limpiados', 'success')
            }}
            aria-label="Limpiar filtros"
            title="Limpiar filtros"
          >
            <img src={clearFilterIcon} alt="" className="drawer__clear-filters-icon" aria-hidden="true" />
          </button>
        </div>
      )
    }

    return null
  })()

  return (
    <>
      {drawerOpen && <DrawerBackdrop onClick={handleClose} />}
      <Drawer
        isOpen={drawerOpen}
        drawerType={drawerType}
        title={drawerTitle}
        onClose={handleClose}
        closeAriaLabel={closeAriaLabel}
        headerActions={headerActions}
      >
        {renderContent()}
      </Drawer>
    </>
  )
}
