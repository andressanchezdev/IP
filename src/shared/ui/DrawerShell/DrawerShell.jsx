import '@/features/cart/components/CartDrawer/CartDrawer.css'
import './DrawerShell.css'

/**
 * Same vertical shell as Filtrar / Carrito:
 * scrollable body + fixed footer bar.
 */
export function DrawerShell({ children, footer }) {
  return (
    <div className="content-main-carrito">
      <div className="content-main-aux-carrito content-main-aux-carrito--scroll">
        {children}
      </div>
      {footer}
    </div>
  )
}

export function DrawerPanel({ title, children, variant = 'default' }) {
  const variantClass = variant === 'quick' ? 'filter-drawer-panel--quick' : ''
  return (
    <div className={`filter-drawer-panel ${variantClass}`.trim()}>
      {title ? <span className="filter-drawer-quick-title">{title}</span> : null}
      {children}
    </div>
  )
}

export function DrawerFooterBar({ label, value, actionLabel, onAction, disabled = false }) {
  return (
    <div className="content-main-data-carrito">
      <div className="content-main-data-carrito__total">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      {actionLabel ? (
        <button
          type="button"
          className="content-main-data-carrito__checkout"
          onClick={onAction}
          disabled={disabled}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

export function DrawerCheckRow({ children, active = false, onClick }) {
  return (
    <button
      type="button"
      className={`filter-drawer-check${active ? ' filter-drawer-check--active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function DrawerSectionList({ children }) {
  return <div className="filter-drawer-quick-list">{children}</div>
}

export function DrawerSectionBody({ children }) {
  return <div className="drawer-shell-section-body">{children}</div>
}
