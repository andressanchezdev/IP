import { SettingsField } from './SettingsField'
import { namedControl } from '@/shared/lib/namedControl'
import {
  INPUT_CHAR_MAX,
  validateEmail,
  validatePersonName,
} from '@/shared/lib/fieldValidation'

export function validateCompanyDraft(draft) {
  const errors = {}

  const nameError = validatePersonName(draft.name, { label: 'El nombre de la empresa' })
  if (nameError) errors.name = nameError

  const emailError = validateEmail(draft.email)
  if (emailError) errors.email = emailError

  return { isValid: Object.keys(errors).length === 0, errors }
}

export function validateAccessDraft(draft) {
  const errors = {}
  const emailError = validateEmail(draft.email)
  if (emailError) errors.email = emailError
  return { isValid: Object.keys(errors).length === 0, errors }
}

export function CompanyDataForm({ draft, onDraftChange, onSave, errors = {} }) {
  return (
    <div className="profile-settings-form">
      <SettingsField
        id="company-name"
        label="Nombre de la empresa"
        value={draft.name}
        onChange={(value) => onDraftChange((current) => ({ ...current, name: value }))}
        maxLength={INPUT_CHAR_MAX}
        error={errors.name || ''}
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
        maxLength={INPUT_CHAR_MAX}
        error={errors.email || ''}
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

export function AccessForm({ draft, onDraftChange, onUpdatePassword, errors = {} }) {
  const emailError = errors.email
    || (String(draft.email ?? '').trim() ? validateEmail(draft.email) : '')

  return (
    <div className="profile-settings-form">
      <SettingsField
        id="access-email"
        label="Correo"
        type="email"
        value={draft.email}
        onChange={(value) => onDraftChange((current) => ({ ...current, email: value }))}
        maxLength={INPUT_CHAR_MAX}
        error={emailError}
      />
      <SettingsField
        id="access-password"
        label="Contraseña"
        type="password"
        value="*********"
        onChange={() => {}}
        disabled
      />
      <button
        type="button"
        className="content-main-data-carrito__checkout profile-settings-inline-action"
        onClick={onUpdatePassword}
        {...namedControl('Actualizar contraseña')}
      >
        Actualizar contraseña
      </button>
    </div>
  )
}
