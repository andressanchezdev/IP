import { SettingsField } from './SettingsField'
import { namedControl } from '@/shared/lib/namedControl'
import {
  INPUT_CHAR_MAX,
  validateAddressLine,
  validateBoundedText,
  validateEmail,
  validatePersonName,
  validatePhone,
  validateReason,
} from '@/shared/lib/fieldValidation'

const PERSONAL_FIELDS = [
  { key: 'fullName', label: 'Nombre' },
  { key: 'documentId', label: 'Cédula' },
  { key: 'mobile', label: 'Celular', type: 'tel' },
  { key: 'phone', label: 'Teléfono', type: 'tel' },
  { key: 'email', label: 'Correo', type: 'email' },
  { key: 'address', label: 'Dirección' },
  { key: 'neighborhood', label: 'Barrio' },
  { key: 'city', label: 'Ciudad' },
  { key: 'department', label: 'Departamento' },
  { key: 'country', label: 'País' },
  { key: 'birthDate', label: 'Fecha nacimiento' },
  { key: 'gender', label: 'Género' },
  { key: 'additional', label: 'Adicional' },
  { key: 'role', label: 'Perfil', disabled: true },
  { key: 'userId', label: 'ID usuario', disabled: true },
  { key: 'warehouseId', label: 'ID bodega', disabled: true },
]

const VALIDATED_KEYS = new Set([
  'fullName',
  'documentId',
  'mobile',
  'phone',
  'email',
  'address',
  'neighborhood',
  'city',
  'department',
  'country',
])

export function validatePersonalDraft(draft) {
  const errors = {}

  const fullNameError = validatePersonName(draft.fullName, { label: 'El nombre' })
  if (fullNameError) errors.fullName = fullNameError

  const documentError = validateBoundedText(draft.documentId, { label: 'La cédula' })
  if (documentError) errors.documentId = documentError

  const mobileError = validatePhone(draft.mobile, { label: 'El celular' })
  if (mobileError) errors.mobile = mobileError

  const phoneError = validatePhone(draft.phone, { label: 'El teléfono' })
  if (phoneError) errors.phone = phoneError

  const emailError = validateEmail(draft.email)
  if (emailError) errors.email = emailError

  const addressError = validateAddressLine(draft.address)
  if (addressError) errors.address = addressError

  const neighborhoodError = validateBoundedText(draft.neighborhood, { label: 'El barrio' })
  if (neighborhoodError) errors.neighborhood = neighborhoodError

  const cityError = validateBoundedText(draft.city, { label: 'La ciudad' })
  if (cityError) errors.city = cityError

  const departmentError = validateBoundedText(draft.department, { label: 'El departamento' })
  if (departmentError) errors.department = departmentError

  const countryError = validateBoundedText(draft.country, { label: 'El país' })
  if (countryError) errors.country = countryError

  const additionalError = validateReason(draft.additional, {
    required: false,
    label: 'Adicional',
  })
  if (additionalError) errors.additional = additionalError

  return { isValid: Object.keys(errors).length === 0, errors }
}

export function PersonalDataForm({ draft, onDraftChange, onSave, errors = {} }) {
  return (
    <div className="profile-settings-form">
      {PERSONAL_FIELDS.map(({ key, label, type = 'text', disabled = false }) => (
        <SettingsField
          key={key}
          id={`personal-${key}`}
          label={label}
          type={type}
          value={draft[key] || ''}
          onChange={(value) => onDraftChange((current) => ({ ...current, [key]: value }))}
          disabled={disabled}
          maxLength={VALIDATED_KEYS.has(key) || key === 'additional' || key === 'gender' ? INPUT_CHAR_MAX : undefined}
          error={errors[key] || ''}
        />
      ))}
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
