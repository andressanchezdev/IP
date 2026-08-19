import { useMemo, useState } from 'react'
import { useCatalog } from '@/app/providers'
import {
  FILTER_OPTIONS_VISIBLE_IDLE,
  FILTER_OPTIONS_VISIBLE_SEARCH,
} from '@/features/catalog/api/generalApi'
import { useGeneralFilter } from '@/features/catalog/hooks/useGeneralFilter'
import {
  DrawerFooterBar,
  DrawerPanel,
  DrawerSectionList,
  DrawerShell,
} from '@/shared/ui/DrawerShell/DrawerShell'
import { MultiFilterField } from './MultiFilterField'
import { namedControl } from '@/shared/lib/namedControl'

/**
 * Marca, categoría y modelo: GET /api/v1/general/filter (token de login).
 * Selección por id; el filtro se aplica con "Aplicar filtro".
 */
export function FilterDrawerContent() {
  const {
    draftFilters,
    setDraftFilters,
    draftFilterModes,
    setDraftFilterModes,
    draftWithStock,
    setDraftWithStock,
    applyCatalogFiltersAndClose,
  } = useCatalog()

  const [openSectionId, setOpenSectionId] = useState(null)
  const {
    categorias,
    marcas,
    modelos,
    status: filterStatus,
    error: filterError,
  } = useGeneralFilter()

  const filterBrands = useMemo(() => marcas, [marcas])
  const filterCategories = useMemo(() => categorias, [categorias])
  const filterModels = useMemo(() => modelos, [modelos])
  const isFilterLoading = filterStatus === 'loading'

  const activeFilterCount =
    (draftFilterModes.brands === 'custom' ? draftFilters.brands.length : 0) +
    (draftFilterModes.categories === 'custom' ? draftFilters.categories.length : 0) +
    (draftFilterModes.models === 'custom' ? draftFilters.models.length : 0) +
    (draftFilterModes.brands === 'none' ? 1 : 0) +
    (draftFilterModes.categories === 'none' ? 1 : 0) +
    (draftFilterModes.models === 'none' ? 1 : 0) +
    (draftWithStock ? 1 : 0)

  const toggleSection = (sectionId) => {
    setOpenSectionId((current) => (current === sectionId ? null : sectionId))
  }

  const addFilterValue = (key, value) => {
    setDraftFilterModes((current) => ({ ...current, [key]: 'custom' }))
    setDraftFilters((current) => {
      const list = current[key] || []
      if (list.includes(value)) {
        return current
      }
      return { ...current, [key]: [...list, value] }
    })
  }

  const removeFilterValue = (key, value) => {
    setDraftFilters((current) => {
      const nextList = (current[key] || []).filter((entry) => entry !== value)
      if (nextList.length === 0) {
        setDraftFilterModes((modes) => ({ ...modes, [key]: 'all' }))
      }
      return {
        ...current,
        [key]: nextList,
      }
    })
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
            visibleIdleRows={FILTER_OPTIONS_VISIBLE_IDLE}
            visibleSearchRows={FILTER_OPTIONS_VISIBLE_SEARCH}
            isLoading={isFilterLoading}
            errorMessage={filterError}
            quickMode={draftFilterModes.brands}
            onSelectAll={() => {
              setDraftFilterModes((current) => ({ ...current, brands: 'all' }))
              setDraftFilters((current) => ({ ...current, brands: [] }))
            }}
            onSetNone={() => {
              setDraftFilterModes((current) => ({ ...current, brands: 'none' }))
              setDraftFilters((current) => ({ ...current, brands: [] }))
            }}
            onClearFilter={() => {
              setDraftFilterModes((current) => ({ ...current, brands: 'all' }))
              setDraftFilters((current) => ({ ...current, brands: [] }))
            }}
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
            visibleIdleRows={FILTER_OPTIONS_VISIBLE_IDLE}
            visibleSearchRows={FILTER_OPTIONS_VISIBLE_SEARCH}
            isLoading={isFilterLoading}
            errorMessage={filterError}
            quickMode={draftFilterModes.categories}
            onSelectAll={() => {
              setDraftFilterModes((current) => ({ ...current, categories: 'all' }))
              setDraftFilters((current) => ({ ...current, categories: [] }))
            }}
            onSetNone={() => {
              setDraftFilterModes((current) => ({ ...current, categories: 'none' }))
              setDraftFilters((current) => ({ ...current, categories: [] }))
            }}
            onClearFilter={() => {
              setDraftFilterModes((current) => ({ ...current, categories: 'all' }))
              setDraftFilters((current) => ({ ...current, categories: [] }))
            }}
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
            visibleIdleRows={FILTER_OPTIONS_VISIBLE_IDLE}
            visibleSearchRows={FILTER_OPTIONS_VISIBLE_SEARCH}
            isLoading={isFilterLoading}
            errorMessage={filterError}
            quickMode={draftFilterModes.models}
            onSelectAll={() => {
              setDraftFilterModes((current) => ({ ...current, models: 'all' }))
              setDraftFilters((current) => ({ ...current, models: [] }))
            }}
            onSetNone={() => {
              setDraftFilterModes((current) => ({ ...current, models: 'none' }))
              setDraftFilters((current) => ({ ...current, models: [] }))
            }}
            onClearFilter={() => {
              setDraftFilterModes((current) => ({ ...current, models: 'all' }))
              setDraftFilters((current) => ({ ...current, models: [] }))
            }}
          />
        </DrawerSectionList>
      </DrawerPanel>

      <DrawerPanel title="Opciones rápidas" variant="quick">
        <DrawerSectionList>
          <label className="filter-drawer-check">
            <span>Con cantidad</span>
            <input
              type="checkbox"
              checked={draftWithStock}
              onChange={(event) => setDraftWithStock(event.target.checked)}
              {...namedControl('Con cantidad')}
            />
          </label>
        </DrawerSectionList>
      </DrawerPanel>
    </DrawerShell>
  )
}
