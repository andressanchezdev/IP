import { useEffect, useMemo, useState } from 'react'
import { SearchBar } from '@/shared/ui/SearchBar/SearchBar'
import { namedControl } from '@/shared/lib/namedControl'
import {
  DrawerCheckRow,
  DrawerSectionBody,
} from '@/shared/ui/DrawerShell/DrawerShell'

function normalizeOptions(options = []) {
  return options.map((option) => {
    if (option && typeof option === 'object' && 'id' in option) {
      return {
        id: String(option.id),
        label: String(option.label ?? ''),
      }
    }
    const label = String(option ?? '')
    return { id: label, label }
  }).filter((entry) => entry.label)
}

/**
 * Acordeón de filtro multi-valor (marca / categoría / modelo).
 * options: [{ id, label }] — selección por id, visualización por label.
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
  onSelectAll,
  onSetNone,
  onClearFilter,
  quickMode = 'all',
}) {
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const normalizedOptions = useMemo(() => normalizeOptions(options), [options])

  const labelById = useMemo(() => {
    const map = new Map()
    normalizedOptions.forEach((entry) => map.set(entry.id, entry.label))
    return map
  }, [normalizedOptions])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSearchTerm('')
    }
  }, [isOpen])

  const hasQuery = Boolean(searchTerm.trim())
  const visibleRows = hasQuery ? visibleSearchRows : visibleIdleRows
  const selectedIds = useMemo(
    () => (selected || []).map((entry) => String(entry)),
    [selected],
  )

  const filteredOptions = useMemo(() => {
    const q = searchTerm.trim().toLocaleLowerCase('es')
    if (!q) {
      return normalizedOptions
    }
    return normalizedOptions.filter((option) =>
      option.label.toLocaleLowerCase('es').includes(q),
    )
  }, [normalizedOptions, searchTerm])

  const displayOptions = useMemo(() => ([
    { key: '__all__', label: 'Todas', type: 'quick-all' },
    { key: '__none__', label: 'Ninguna', type: 'quick-none' },
    ...filteredOptions.map((option) => ({
      key: option.id,
      id: option.id,
      label: option.label,
      type: 'option',
    })),
  ]), [filteredOptions])

  return (
    <div className="drawer-shell-section">
      <DrawerCheckRow active={isOpen} onClick={() => onToggle(id)} label={label}>
        <span>{label}</span>
        <span
          className={`filter-drawer-check__caret${isOpen ? ' filter-drawer-check__caret--open' : ''}`}
          aria-hidden="true"
        />
      </DrawerCheckRow>

      {selectedIds.length > 0 ? (
        <div className="filter-drawer-selected" aria-label={`${label} seleccionadas`}>
          {selectedIds.map((itemId) => (
            <span key={itemId} className="filter-drawer-chip">
              <span className="filter-drawer-chip__label">{labelById.get(itemId) || itemId}</span>
              <button
                type="button"
                className="filter-drawer-chip__remove"
                onClick={() => onRemove(itemId)}
                {...namedControl(`Quitar ${labelById.get(itemId) || itemId}`)}
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
              onSubmit={(value) => setSearchTerm(String(value ?? '').trim())}
              onClear={() => {
                setQuery('')
                setSearchTerm('')
                onClearFilter?.()
              }}
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
          ) : displayOptions.length === 2 ? (
            <div className="content-list-data__row">
              <span className="content-list-data__label">
                {normalizedOptions.length === 0 ? emptyLabel : 'Sin coincidencias'}
              </span>
            </div>
          ) : (
            <div
              className={`drawer-shell-section-options${visibleRows > 0 ? ' drawer-shell-section-options--scroll' : ''}`}
              style={visibleRows > 0 ? { '--filter-option-rows': visibleRows } : undefined}
            >
              {displayOptions.map((entry) => {
                if (entry.type === 'quick-all') {
                  const isQuickActive = quickMode === 'all'
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      className="content-list-data__row content-list-data__row--action"
                      onClick={() => onSelectAll?.()}
                      {...namedControl(`Seleccionar todas ${label}`)}
                    >
                      <span className="content-list-data__label">{entry.label}</span>
                      <span
                        className={`content-list-data__value${isQuickActive ? ' content-list-data__value--highlight' : ''}`}
                        aria-hidden="true"
                      >
                        {isQuickActive ? '✓' : '›'}
                      </span>
                    </button>
                  )
                }

                if (entry.type === 'quick-none') {
                  const isQuickActive = quickMode === 'none'
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      className="content-list-data__row content-list-data__row--action"
                      onClick={() => onSetNone?.()}
                      {...namedControl(`Sin ${label}`)}
                    >
                      <span className="content-list-data__label">{entry.label}</span>
                      <span
                        className={`content-list-data__value${isQuickActive ? ' content-list-data__value--highlight' : ''}`}
                        aria-hidden="true"
                      >
                        {isQuickActive ? '✓' : '›'}
                      </span>
                    </button>
                  )
                }

                const optionId = entry.id
                const isSelected = selectedIds.includes(optionId)
                return (
                  <button
                    key={entry.key}
                    type="button"
                    className="content-list-data__row content-list-data__row--action"
                    onClick={() => (isSelected ? onRemove(optionId) : onAdd(optionId))}
                    aria-pressed={isSelected}
                    {...namedControl(isSelected ? `Quitar ${entry.label}` : `Seleccionar ${entry.label}`)}
                  >
                    <span className="content-list-data__label">{entry.label}</span>
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
