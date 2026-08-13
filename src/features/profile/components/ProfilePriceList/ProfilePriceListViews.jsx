import { useMemo, useState } from 'react'
import { useCatalog } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { downloadPriceListPdf } from '@/shared/lib/downloadPriceListPdf'
import { uniqueSorted } from '@/shared/lib/uniqueSorted'
import { SearchBar } from '@/shared/ui/SearchBar/SearchBar'
import {
  DrawerCheckRow,
  DrawerPanel,
  DrawerSectionList,
  DrawerShell,
} from '@/shared/ui/DrawerShell/DrawerShell'
import './ProfilePriceList.css'

/**
 * Método de descarga: Excel o PDF (subvista del drawer de perfil).
 */
export function ProfileDownloadMethodContent({ onSelect }) {
  const { products } = useCatalog()
  const { showToast } = useToast()

  const pick = (method) => {
    if (method === 'pdf') {
      downloadPriceListPdf({
        products,
        filename: 'listado-precios.pdf',
      })
      showToast('PDF de listado descargado', 'success')
      onSelect?.(method)
      return
    }

    onSelect?.(method)
    showToast('Método: Excel seleccionado', 'success')
  }

  return (
    <DrawerShell>
      <DrawerPanel title="Método de descarga" variant="quick">
        <DrawerSectionList>
          <DrawerCheckRow onClick={() => pick('excel')}>
            <span>Excel</span>
            <span className="filter-drawer-check__caret" aria-hidden="true" />
          </DrawerCheckRow>
          <DrawerCheckRow onClick={() => pick('pdf')}>
            <span>PDF</span>
            <span className="filter-drawer-check__caret" aria-hidden="true" />
          </DrawerCheckRow>
        </DrawerSectionList>
      </DrawerPanel>
    </DrawerShell>
  )
}

/**
 * Picker con barra de búsqueda sobre marcas / categorías / modelos del catálogo.
 */
export function ProfileCatalogPickerContent({
  field = 'brand',
  title = 'Seleccionar',
  onSelect,
}) {
  const { products } = useCatalog()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')

  const options = useMemo(() => {
    const key = field === 'category' ? 'category' : field === 'model' ? 'model' : 'brand'
    return uniqueSorted(products.map((product) => product[key]))
  }, [field, products])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('es')
    if (!q) {
      return options
    }
    return options.filter((option) => option.toLocaleLowerCase('es').includes(q))
  }, [options, query])

  const handlePick = (value) => {
    onSelect?.(value)
    showToast(`${title}: ${value}`, 'success')
  }

  return (
    <DrawerShell>
      <DrawerPanel title={title}>
        <div className="profile-price-list__search">
          <SearchBar
            value={query}
            onChange={setQuery}
            onClear={() => setQuery('')}
            placeholder={`Buscar ${title.toLowerCase()}`}
            ariaLabel={`Buscar ${title.toLowerCase()}`}
          />
        </div>
        <DrawerSectionList>
          {filtered.length === 0 ? (
            <p className="profile-price-list__empty">Sin coincidencias</p>
          ) : (
            filtered.map((option) => (
              <DrawerCheckRow key={option} onClick={() => handlePick(option)}>
                <span>{option}</span>
                <span className="filter-drawer-check__caret" aria-hidden="true" />
              </DrawerCheckRow>
            ))
          )}
        </DrawerSectionList>
      </DrawerPanel>
    </DrawerShell>
  )
}
