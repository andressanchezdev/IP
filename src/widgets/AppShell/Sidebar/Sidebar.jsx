import ipLogo from '@/assets/logos/icon.ico'
import storeIcon from '@/assets/icons/store.svg'
import waitIcon from '@/assets/icons/wait.svg'
import historyIcon from '@/assets/icons/history.svg'
import logoutIcon from '@/assets/icons/logout.svg'
import loginIcon from '@/assets/icons/login.svg'
import './Sidebar.css'

const NAV_ITEMS = [
  { id: 'tienda', label: 'Tienda', icon: storeIcon },
  { id: 'espera', label: 'Espera', icon: waitIcon },
  { id: 'historial', label: 'Historial', icon: historyIcon },
]

export function Sidebar({
  activeItem = 'tienda',
  isAuthenticated = false,
  onNavigate,
  onProfileClick,
  onLogin,
  onLogout,
}) {
  const handleSessionAction = () => {
    if (isAuthenticated) {
      onLogout?.()
      return
    }
    onLogin?.()
  }

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <button
        type="button"
        className="sidebar__logo-btn"
        onClick={onProfileClick}
        aria-label="Abrir perfil"
      >
        <img src={ipLogo} alt="Importadora Premium" className="sidebar__logo" />
      </button>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            className={`sidebar__item ${activeItem === id ? 'sidebar__item--active' : ''}`}
            onClick={() => onNavigate?.(id)}
            aria-current={activeItem === id ? 'page' : undefined}
          >
            <img src={icon} alt="" className="sidebar__icon" aria-hidden="true" />
            <span className="sidebar__label">{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <button
          type="button"
          className="sidebar__item sidebar__item--logout"
          onClick={handleSessionAction}
          aria-label={isAuthenticated ? 'Cerrar sesión' : 'Iniciar sesión'}
        >
          <img
            src={isAuthenticated ? logoutIcon : loginIcon}
            alt=""
            className="sidebar__icon"
            aria-hidden="true"
          />
          <span className="sidebar__label">{isAuthenticated ? 'Salir' : 'Iniciar sesión'}</span>
        </button>
      </div>
    </aside>
  )
}
