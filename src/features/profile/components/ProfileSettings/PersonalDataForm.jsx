import { SettingsField } from './SettingsField'

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

export function PersonalDataForm({ draft, onDraftChange, onSave }) {
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
        />
      ))}
      <button
        type="button"
        className="content-main-data-carrito__checkout profile-settings-inline-action"
        onClick={onSave}
      >
        Guardar datos
      </button>
    </div>
  )
}
