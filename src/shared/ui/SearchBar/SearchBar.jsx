import searchIcon from '@/assets/icons/search.svg'
import './SearchBar.css'

export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar',
  ariaLabel = 'Buscar',
  onClear,
  canClear,
  onFocus,
  onSubmit,
}) {
  const isClearEnabled = canClear ?? Boolean(value?.trim())

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') {
      return
    }
    event.preventDefault()
    onSubmit?.(value)
  }

  return (
    <div className="search-bar">
      <img src={searchIcon} alt="" className="search-bar__icon" aria-hidden="true" />
      <input
        type="search"
        className="search-bar__input"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onFocus={(event) => onFocus?.(event)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        enterKeyHint="search"
      />
      {onClear && (
        <button
          type="button"
          className="search-bar__clear"
          onClick={onClear}
          disabled={!isClearEnabled}
          aria-label="Limpiar búsqueda y filtros"
        >
          ×
        </button>
      )}
    </div>
  )
}
