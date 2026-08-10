import { AppProviders } from '@/app/providers'
import { StorePage } from '@/pages/StorePage'

function App() {
  return (
    <AppProviders>
      <StorePage />
    </AppProviders>
  )
}

export default App
