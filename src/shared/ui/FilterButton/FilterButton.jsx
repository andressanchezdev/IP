import { namedControl, namedImage } from '@/shared/lib/namedControl'
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
      {...namedControl(label)}
    >
      {icon && <img src={icon} className="filter-button__icon" {...namedImage(label)} />}
      {label}
    </button>
  )
}
