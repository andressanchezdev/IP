import './Drawer.css'

const DRAWER_TITLES = {
  cart: 'Carrito',
  filter: 'Filtrar',
  profile: 'Perfil',
  order: 'Detalle del pedido',
}

export function Drawer({ isOpen, drawerType, title, onClose, closeAriaLabel, headerActions, children }) {
  const resolvedTitle = title ?? DRAWER_TITLES[drawerType] ?? ''

  return (
    <aside className={`drawer ${isOpen ? 'drawer--open' : ''}`}>
      <div className="drawer__header">
        <button type="button" className="drawer__close" onClick={onClose} aria-label={closeAriaLabel}>
          ×
        </button>

        <div className="drawer__title">{resolvedTitle}</div>

        {headerActions ?? <span className="drawer__header-spacer" aria-hidden="true" />}
      </div>

      {children}
    </aside>
  )
}

export function DrawerBackdrop({ onClick }) {
  return <div className="drawer-backdrop" onClick={onClick} />
}
