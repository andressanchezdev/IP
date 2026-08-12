import { useCallback, useMemo, useState } from 'react'

export function useUiSlice({
  syncFilterDraftFromApplied,
  resetOrderDrawer,
  setCartCheckoutStep,
  authUsername,
  setPendingEsperaView,
  setAuthModalOpen,
  setAuthModalMode,
}) {
  const [activeView, setActiveView] = useState('tienda')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerType, setDrawerType] = useState('cart')

  const openDrawer = useCallback((type = 'cart') => {
    if (type !== 'order') {
      resetOrderDrawer()
    }

    // Filtrar draft is only applied via "Aplicar filtro", never on drawer switch.
    if (type === 'filter') {
      syncFilterDraftFromApplied()
    }

    setDrawerType(type)
    setDrawerOpen(true)
  }, [resetOrderDrawer, syncFilterDraftFromApplied])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setCartCheckoutStep(0)
    resetOrderDrawer()
  }, [resetOrderDrawer, setCartCheckoutStep])

  const navigateToView = useCallback((view) => {
    if (view === 'espera' && !authUsername) {
      setPendingEsperaView(true)
      setAuthModalOpen(true)
      setAuthModalMode('login')
      return false
    }

    setActiveView(view)
    return true
  }, [authUsername, setAuthModalMode, setAuthModalOpen, setPendingEsperaView])

  const value = useMemo(() => ({
    activeView,
    setActiveView,
    navigateToView,
    drawerOpen,
    drawerType,
    openDrawer,
    closeDrawer,
  }), [activeView, navigateToView, drawerOpen, drawerType, openDrawer, closeDrawer])

  return {
    setActiveView,
    setDrawerOpen,
    setDrawerType,
    value,
  }
}
