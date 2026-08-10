import { useContext, useMemo } from 'react'
import { AppContext } from '../../../context/AppContext'
import './CartDrawer.css'
import './FilterDrawer.css'

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

export function FilterDrawerContent() {
  const {
    products,
    filters,
    setFilters,
    filterNuevos,
    setFilterNuevos,
    filterPromociones,
    setFilterPromociones,
    withStock,
    setWithStock,
  } = useContext(AppContext)

  const filterBrands = useMemo(
    () => [...new Set(products.map((product) => product.brand))],
    [products],
  )
  const filterCategories = useMemo(
    () => [...new Set(products.map((product) => product.category))],
    [products],
  )
  const filterModels = useMemo(
    () => [...new Set(products.map((product) => product.model))],
    [products],
  )

  const activeFilterCount =
    filters.brands.length +
    filters.categories.length +
    filters.models.length +
    (filterNuevos ? 1 : 0) +
    (filterPromociones ? 1 : 0) +
    (withStock ? 1 : 0)

  const addFilterValue = (key, value) => {
    setFilters((current) => {
      if (current[key].includes(value)) {
        return current
      }
      return { ...current, [key]: [...current[key], value] }
    })
  }

  const removeFilterValue = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: current[key].filter((entry) => entry !== value),
    }))
  }

  return (
    <div className="content-main-carrito">
      <div className="content-main-aux-carrito">
        <div className="filter-drawer-panel">
          <MultiFilterField
            label="Marca"
            emptyLabel="Seleccionar marca"
            options={filterBrands}
            selected={filters.brands}
            onAdd={(value) => addFilterValue('brands', value)}
            onRemove={(value) => removeFilterValue('brands', value)}
          />

          <MultiFilterField
            label="Categoría"
            emptyLabel="Seleccionar categoría"
            options={filterCategories}
            selected={filters.categories}
            onAdd={(value) => addFilterValue('categories', value)}
            onRemove={(value) => removeFilterValue('categories', value)}
          />

          <MultiFilterField
            label="Modelo"
            emptyLabel="Seleccionar modelo"
            options={filterModels}
            selected={filters.models}
            onAdd={(value) => addFilterValue('models', value)}
            onRemove={(value) => removeFilterValue('models', value)}
          />
        </div>

        <div className="filter-drawer-panel filter-drawer-panel--quick">
          <span className="filter-drawer-quick-title">Opciones rápidas</span>
          <div className="filter-drawer-quick-list">
            <label className="filter-drawer-check">
              <input
                type="checkbox"
                checked={filterPromociones}
                onChange={(event) => setFilterPromociones(event.target.checked)}
              />
              <span>Promociones</span>
            </label>
            <label className="filter-drawer-check">
              <input
                type="checkbox"
                checked={filterNuevos}
                onChange={(event) => setFilterNuevos(event.target.checked)}
              />
              <span>Nuevos</span>
            </label>
            <label className="filter-drawer-check">
              <input
                type="checkbox"
                checked={withStock}
                onChange={(event) => setWithStock(event.target.checked)}
              />
              <span>Con cantidad</span>
            </label>
          </div>
        </div>
      </div>

      <div className="content-main-data-carrito">
        <div className="content-main-data-carrito__total">
          <span>Filtros activos</span>
          <strong>{activeFilterCount}</strong>
        </div>
      </div>
    </div>
  )
}
