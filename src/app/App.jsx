import { AppProviders } from '@/app/providers'
import { StorePage } from '@/pages/StorePage'
import { NotFoundPage } from '@/pages/NotFoundPage/NotFoundPage'

const STORE_PATHS = new Set(['/', ''])

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (!STORE_PATHS.has(path)) {
    return <NotFoundPage />
  }

  return (
    <AppProviders>
      <StorePage />
    </AppProviders>
  )
}

export default App
