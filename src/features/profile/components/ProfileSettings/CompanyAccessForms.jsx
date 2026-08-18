import { SettingsField } from './SettingsField'
import { namedControl } from '@/shared/lib/namedControl'

export function CompanyDataForm({ draft, onDraftChange, onSave }) {
  return (
    <div className="profile-settings-form">
      <SettingsField
        id="company-name"
        label="Nombre de la empresa"
        value={draft.name}
        onChange={(value) => onDraftChange((current) => ({ ...current, name: value }))}
      />
      <SettingsField
        id="company-nit"
        label="NIT"
        value={draft.nit}
        onChange={(value) => onDraftChange((current) => ({ ...current, nit: value }))}
        disabled
      />
      <SettingsField
        id="company-phone"
        label="Teléfono"
        type="tel"
        value={draft.phone}
        onChange={(value) => onDraftChange((current) => ({ ...current, phone: value }))}
        disabled
      />
      <SettingsField
        id="company-email"
        label="Correo"
        type="email"
        value={draft.email}
        onChange={(value) => onDraftChange((current) => ({ ...current, email: value }))}
      />
      <SettingsField
        id="company-address"
        label="Dirección"
        value={draft.address}
        onChange={(value) => onDraftChange((current) => ({ ...current, address: value }))}
        disabled
      />
      <button
        type="button"
        className="content-main-data-carrito__checkout profile-settings-inline-action"
        onClick={onSave}
        {...namedControl('Guardar datos')}
      >
        Guardar datos
      </button>
    </div>
  )
}

export function AccessForm({ draft, onDraftChange, onSave }) {
  return (
    <div className="profile-settings-form">
      <SettingsField
        id="access-email"
        label="Correo"
        type="email"
        value={draft.email}
        onChange={(value) => onDraftChange((current) => ({ ...current, email: value }))}
      />
      <SettingsField
        id="access-password"
        label="Contraseña"
        type="password"
        value={draft.password}
        onChange={(value) => onDraftChange((current) => ({ ...current, password: value }))}
      />
      <button
        type="button"
        className="content-main-data-carrito__checkout profile-settings-inline-action"
        onClick={onSave}
        {...namedControl('Guardar acceso')}
      >
        Guardar acceso
      </button>
    </div>
  )
}
