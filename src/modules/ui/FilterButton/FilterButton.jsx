import './FilterButton.css'

const VARIANTS = {
  filter: 'filter-button--filter',
  new: 'filter-button--new',
  promo: 'filter-button--promo',
}

export function FilterButton({ label, icon, variant = 'filter', onClick, isActive = false }) {
  return (
    <button
      type="button"
      className={`filter-button ${VARIANTS[variant] ?? VARIANTS.filter} ${isActive ? 'filter-button--active' : ''}`}
      onClick={onClick}
      aria-pressed={isActive}
    >
      {icon && <img src={icon} alt="" className="filter-button__icon" aria-hidden="true" />}
      {label}
    </button>
  )
}
