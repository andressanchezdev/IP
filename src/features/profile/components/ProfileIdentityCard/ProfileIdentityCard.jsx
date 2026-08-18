import { defaultProfileSettings } from '@/features/profile/data/profileDefaults'
import profileAvatar from '@/assets/logos/icon.ico'
import { namedControl } from '@/shared/lib/namedControl'
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
  const identityId = data.userId || data.documentId
  const backgroundImage = `url(${avatar || profileAvatar})`

  return (
    <div
      className="content-perfil-perfil"
      style={{ backgroundImage }}
      {...namedControl('Datos del cliente')}
    >
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
