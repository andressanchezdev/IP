import { useEffect, useMemo, useState } from 'react'
import { SearchBar } from '@/shared/ui/SearchBar/SearchBar'
import { namedControl } from '@/shared/lib/namedControl'
import {
  DrawerCheckRow,
  DrawerSectionBody,
} from '@/shared/ui/DrawerShell/DrawerShell'

/**
 * Acordeón de filtro multi-valor (marca / categoría / modelo)
 * con barra de búsqueda sobre las opciones de ese campo.
 */
export function MultiFilterField({
  id,
  label,
  options,
  selected,
  emptyLabel,
  isOpen,
  onToggle,
  onAdd,
  onRemove,
  visibleIdleRows = 0,
  visibleSearchRows = 0,
  isLoading = false,
  errorMessage = '',
}) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
    }
  }, [isOpen])

  const hasQuery = Boolean(query.trim())
  const visibleRows = hasQuery ? visibleSearchRows : visibleIdleRows

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('es')
    if (!q) {
      return options
    }
    return options.filter((option) =>
      String(option).toLocaleLowerCase('es').includes(q),
    )
  }, [options, query])

  return (
    <div className="drawer-shell-section">
      <DrawerCheckRow active={isOpen} onClick={() => onToggle(id)} label={label}>
        <span>{label}</span>
        <span
          className={`filter-drawer-check__caret${isOpen ? ' filter-drawer-check__caret--open' : ''}`}
          aria-hidden="true"
        />
      </DrawerCheckRow>

      {selected.length > 0 ? (
        <div className="filter-drawer-selected" aria-label={`${label} seleccionadas`}>
          {selected.map((item) => (
            <span key={item} className="filter-drawer-chip">
              <span className="filter-drawer-chip__label">{item}</span>
              <button
                type="button"
                className="filter-drawer-chip__remove"
                onClick={() => onRemove(item)}
                {...namedControl(`Quitar ${item}`)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {isOpen ? (
        <DrawerSectionBody>
          <div
            className="drawer-shell-section-search"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <SearchBar
              value={query}
              onChange={setQuery}
              onClear={() => setQuery('')}
              placeholder={`Buscar ${label.toLowerCase()}`}
              ariaLabel={`Buscar ${label.toLowerCase()}`}
            />
          </div>

          {isLoading ? (
            <div className="content-list-data__row">
              <span className="content-list-data__label">Cargando {label.toLowerCase()}…</span>
            </div>
          ) : errorMessage ? (
            <div className="content-list-data__row">
              <span className="content-list-data__label">{errorMessage}</span>
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="content-list-data__row">
              <span className="content-list-data__label">
                {options.length === 0 ? emptyLabel : 'Sin coincidencias'}
              </span>
            </div>
          ) : (
            <div
              className={`drawer-shell-section-options${visibleRows > 0 ? ' drawer-shell-section-options--scroll' : ''}`}
              style={visibleRows > 0 ? { '--filter-option-rows': visibleRows } : undefined}
            >
              {filteredOptions.map((option) => {
                const isSelected = selected.includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    className="content-list-data__row content-list-data__row--action"
                    onClick={() => (isSelected ? onRemove(option) : onAdd(option))}
                    aria-pressed={isSelected}
                    {...namedControl(isSelected ? `Quitar ${option}` : `Seleccionar ${option}`)}
                  >
                    <span className="content-list-data__label">{option}</span>
                    <span
                      className={`content-list-data__value${isSelected ? ' content-list-data__value--highlight' : ''}`}
                      aria-hidden="true"
                    >
                      {isSelected ? '✓' : '›'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </DrawerSectionBody>
      ) : null}
    </div>
  )
}
