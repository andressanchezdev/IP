import { namedControl } from '@/shared/lib/namedControl'
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
    <aside className={`drawer ${isOpen ? 'drawer--open' : ''}`} {...namedControl(resolvedTitle || 'Panel')}>
      <div className="drawer__header">
        <button type="button" className="drawer__close" onClick={onClose} {...namedControl(closeAriaLabel || 'Cerrar panel')}>
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
  return <div className="drawer-backdrop" onClick={onClick} {...namedControl('Cerrar panel')} />
}
