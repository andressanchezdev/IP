import { useMemo } from 'react'
import { useCatalog } from '@/app/providers'
import { uniqueSorted } from '@/shared/lib/uniqueSorted'
import {
  DrawerFooterBar,
  DrawerPanel,
  DrawerSectionList,
  DrawerShell,
} from '@/shared/ui/DrawerShell/DrawerShell'

function MultiFilterField({ label, options, selected, emptyLabel, onAdd, onRemove }) {
  const availableOptions = options.filter((option) => !selected.includes(option))

  return (
    <div className="filter-drawer-field">
      <span>{label}</span>
      <select
        value=""
        onChange={(event) => {
          const nextValue = event.target.value
          if (nextValue) {
            onAdd(nextValue)
          }
        }}
        aria-label={`Agregar ${label.toLowerCase()}`}
      >
        <option value="">{emptyLabel}</option>
        {availableOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {selected.length > 0 && (
        <div className="filter-drawer-selected" aria-label={`${label} seleccionadas`}>
          {selected.map((item) => (
            <span key={item} className="filter-drawer-chip">
              <span className="filter-drawer-chip__label">{item}</span>
              <button
                type="button"
                className="filter-drawer-chip__remove"
                onClick={() => onRemove(item)}
                aria-label={`Quitar ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

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
        <MultiFilterField
          label="Marca"
          emptyLabel="Seleccionar marca"
          options={filterBrands}
          selected={draftFilters.brands}
          onAdd={(value) => addFilterValue('brands', value)}
          onRemove={(value) => removeFilterValue('brands', value)}
        />

        <MultiFilterField
          label="Categoría"
          emptyLabel="Seleccionar categoría"
          options={filterCategories}
          selected={draftFilters.categories}
          onAdd={(value) => addFilterValue('categories', value)}
          onRemove={(value) => removeFilterValue('categories', value)}
        />

        <MultiFilterField
          label="Modelo"
          emptyLabel="Seleccionar modelo"
          options={filterModels}
          selected={draftFilters.models}
          onAdd={(value) => addFilterValue('models', value)}
          onRemove={(value) => removeFilterValue('models', value)}
        />
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
