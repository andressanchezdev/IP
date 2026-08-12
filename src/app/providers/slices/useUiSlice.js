import { useCallback, useMemo, useState } from 'react'
import { APP_EVENTS } from '../appEvents'

export function useUiSlice({ events, authUsername }) {
  const [activeView, setActiveView] = useState('tienda')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerType, setDrawerType] = useState('cart')

  const openDrawer = useCallback((type = 'cart') => {
    // Los demás dominios reaccionan (reset de order drawer, sync de filtros).
    events.emit(APP_EVENTS.DRAWER_OPENED, { type })
    setDrawerType(type)
    setDrawerOpen(true)
  }, [events])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    events.emit(APP_EVENTS.DRAWER_CLOSED)
  }, [events])

  const navigateToView = useCallback((view) => {
    if (view === 'espera' && !authUsername) {
      events.emit(APP_EVENTS.AUTH_REQUIRED, { pending: 'espera' })
      return false
    }

    setActiveView(view)
    return true
  }, [authUsername, events])

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
    closeDrawer,
    value,
  }
}
