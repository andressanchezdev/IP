import { useMemo, useState } from 'react'
import { useCatalog } from '@/app/providers'
import { uniqueSorted } from '@/shared/lib/uniqueSorted'
import {
  DrawerFooterBar,
  DrawerPanel,
  DrawerSectionList,
  DrawerShell,
} from '@/shared/ui/DrawerShell/DrawerShell'
import { MultiFilterField } from './MultiFilterField'

/**
 * Opciones de filtro desde el JSON de productos.
 * Edita solo el draft; el filtro combinado se aplica con "Aplicar filtro".
 */
export function FilterDrawerContent() {
  const {
    products,
    searchProducts,
    draftFilters,
    setDraftFilters,
    draftFilterNuevos,
    setDraftFilterNuevos,
    draftFilterPromociones,
    setDraftFilterPromociones,
    draftWithStock,
    setDraftWithStock,
    applyCatalogFiltersAndClose,
  } = useCatalog()

  const [openSectionId, setOpenSectionId] = useState(null)

  const sourceProducts = searchProducts != null ? searchProducts : products

  const filterBrands = useMemo(
    () => uniqueSorted(sourceProducts.map((product) => product.brand)),
    [sourceProducts],
  )
  const filterCategories = useMemo(
    () => uniqueSorted(sourceProducts.map((product) => product.category)),
    [sourceProducts],
  )
  const filterModels = useMemo(
    () => uniqueSorted(sourceProducts.map((product) => product.model)),
    [sourceProducts],
  )

  const activeFilterCount =
    draftFilters.brands.length +
    draftFilters.categories.length +
    draftFilters.models.length +
    (draftFilterNuevos ? 1 : 0) +
    (draftFilterPromociones ? 1 : 0) +
    (draftWithStock ? 1 : 0)

  const toggleSection = (sectionId) => {
    setOpenSectionId((current) => (current === sectionId ? null : sectionId))
  }

  const addFilterValue = (key, value) => {
    setDraftFilters((current) => {
      const list = current[key] || []
      if (list.includes(value)) {
        return current
      }
      return { ...current, [key]: [...list, value] }
    })
  }

  const removeFilterValue = (key, value) => {
    setDraftFilters((current) => ({
      ...current,
      [key]: (current[key] || []).filter((entry) => entry !== value),
    }))
  }

  return (
    <DrawerShell
      footer={(
        <DrawerFooterBar
          label="Filtros activos"
          value={activeFilterCount}
          actionLabel="Aplicar filtro"
          onAction={applyCatalogFiltersAndClose}
        />
      )}
    >
      <DrawerPanel>
        <DrawerSectionList>
          <MultiFilterField
            id="brands"
            label="Marca"
            emptyLabel="Sin marcas disponibles"
            options={filterBrands}
            selected={draftFilters.brands}
            isOpen={openSectionId === 'brands'}
            onToggle={toggleSection}
            onAdd={(value) => addFilterValue('brands', value)}
            onRemove={(value) => removeFilterValue('brands', value)}
          />

          <MultiFilterField
            id="categories"
            label="Categoría"
            emptyLabel="Sin categorías disponibles"
            options={filterCategories}
            selected={draftFilters.categories}
            isOpen={openSectionId === 'categories'}
            onToggle={toggleSection}
            onAdd={(value) => addFilterValue('categories', value)}
            onRemove={(value) => removeFilterValue('categories', value)}
          />

          <MultiFilterField
            id="models"
            label="Modelo"
            emptyLabel="Sin modelos disponibles"
            options={filterModels}
            selected={draftFilters.models}
            isOpen={openSectionId === 'models'}
            onToggle={toggleSection}
            onAdd={(value) => addFilterValue('models', value)}
            onRemove={(value) => removeFilterValue('models', value)}
          />
        </DrawerSectionList>
      </DrawerPanel>

      <DrawerPanel title="Opciones rápidas" variant="quick">
        <DrawerSectionList>
          <label className="filter-drawer-check">
            <span>Promociones</span>
            <input
              type="checkbox"
              checked={draftFilterPromociones}
              onChange={(event) => setDraftFilterPromociones(event.target.checked)}
            />
          </label>
          <label className="filter-drawer-check">
            <span>Nuevos</span>
            <input
              type="checkbox"
              checked={draftFilterNuevos}
              onChange={(event) => setDraftFilterNuevos(event.target.checked)}
            />
          </label>
          <label className="filter-drawer-check">
            <span>Con cantidad</span>
            <input
              type="checkbox"
              checked={draftWithStock}
              onChange={(event) => setDraftWithStock(event.target.checked)}
            />
          </label>
        </DrawerSectionList>
      </DrawerPanel>
    </DrawerShell>
  )
}
