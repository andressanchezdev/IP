import { AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import { LandingPage } from './features/landing/LandingPage'

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <LandingPage />
      </ToastProvider>
    </AppProvider>
  )
}

export default App
