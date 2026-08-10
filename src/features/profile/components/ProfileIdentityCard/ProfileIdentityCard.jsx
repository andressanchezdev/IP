import { defaultProfileSettings } from '@/features/profile/data/profileDefaults'
import profileAvatar from '@/assets/logos/icon.ico'
import '../ProfileDrawer/ProfileDrawer.css'

function displayValue(value) {
  const text = String(value ?? '').trim()
  return text || '—'
}

/**
 * Cabecera de cliente dentro de `.content-perfil-perfil`.
 * Un solo bloque de campos: clave + valor (nombre, id).
 */
export function ProfileIdentityCard({ personal, avatar }) {
  const data = {
    ...defaultProfileSettings.personal,
    ...(personal || {}),
  }
  const statusInitial = String(data.role || '').trim().charAt(0).toUpperCase()
  const identityId = data.userId || data.documentId

  return (
    <div
      className="content-perfil-perfil"
      data-perfil={statusInitial || undefined}
      aria-label="Datos del cliente"
    >
      <img
        src={avatar || profileAvatar}
        alt=""
        className="content-perfil-perfil__avatar"
        aria-hidden="true"
      />

      <div className="content-perfil-perfil__fields">
        <div className="content-perfil-perfil__field" data-field="identidad">
          <div className="content-perfil-perfil__row">
            <span className="content-perfil-perfil__label">Nombre</span>
            <strong className="content-perfil-perfil__value content-perfil-perfil__value--name">
              {displayValue(data.fullName)}
            </strong>
          </div>

          <div className="content-perfil-perfil__row">
            <span className="content-perfil-perfil__label">ID</span>
            <span className="content-perfil-perfil__value">
              {displayValue(identityId)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
