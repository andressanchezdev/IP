import { createContext, useCallback, useContext, useMemo } from 'react'
import Swal from 'sweetalert2'
import '../modules/ui/Toast/Toast.css'

const ToastContext = createContext(null)
const TOAST_DURATION_DESKTOP_MS = 1500
const TOAST_DURATION_MOBILE_MS = 800
const MOBILE_TOAST_QUERY = '(max-width: 640px)'

function getToastOptions() {
  const isMobile = typeof window !== 'undefined' && window.matchMedia(MOBILE_TOAST_QUERY).matches

  return {
    toast: true,
    position: 'top',
    showConfirmButton: false,
    showCloseButton: true,
    timer: isMobile ? TOAST_DURATION_MOBILE_MS : TOAST_DURATION_DESKTOP_MS,
    timerProgressBar: true,
    customClass: {
      container: isMobile ? 'toast-container--mobile' : 'toast-container--desktop',
      popup: isMobile ? 'toast-popup--mobile' : 'toast-popup--desktop',
    },
  }
}

export function ToastProvider({ children }) {
  const showToast = useCallback((title = 'Hecho', icon = 'success') => {
    Swal.mixin({
      ...getToastOptions(),
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer
        toast.onmouseleave = Swal.resumeTimer
      },
    }).fire({ icon, title })
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider')
  }
  return context
}
