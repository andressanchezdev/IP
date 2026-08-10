import { AppProvider } from './AppProvider'
import { ToastProvider } from './ToastProvider'

export function AppProviders({ children }) {
  return (
    <AppProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AppProvider>
  )
}

export {
  useAuth,
  useCart,
  useOrders,
  useCatalog,
  useProfile,
  useUi,
} from './storeContexts'
