import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '@/shared/ui/Modal/Modal'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import {
  INPUT_CHAR_MAX,
  validateAddressLine,
  validateBoundedText,
  validateReason,
  validateUnique,
} from '@/shared/lib/fieldValidation'
import '@/features/auth/components/AuthModal/AuthModal.css'
import userIcon from '@/assets/icons/user.svg'
import mapPinIcon from '@/assets/icons/map-pin.svg'
import buildingIcon from '@/assets/icons/building.svg'
import shippingIcon from '@/assets/icons/shipping.svg'

const ADDRESS_FIELDS = [
  { key: 'label', label: 'Nombre de la dirección', placeholder: 'Ej: Casa, Oficina', icon: userIcon },
  { key: 'address', label: 'Dirección', placeholder: 'Ej: Calle 123 #45-67', icon: mapPinIcon },
  { key: 'neighborhood', label: 'Barrio', placeholder: 'Ej: La Soledad', icon: mapPinIcon },
  { key: 'city', label: 'Ciudad', placeholder: 'Ej: Bogotá', icon: buildingIcon },
  { key: 'department', label: 'Departamento', placeholder: 'Ej: Cundinamarca', icon: buildingIcon },
  { key: 'country', label: 'País', placeholder: 'Ej: Colombia', icon: shippingIcon },
  { key: 'postalCode', label: 'Código postal', placeholder: 'Ej: 110111', icon: shippingIcon },
  { key: 'notes', label: 'Notas adicionales', optional: true },
]

function toPascalCase(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1))
}

function normalizeAddressField(value) {
  const trimmed = value.trimStart()
  if (!trimmed) return value
  const isAllUpper = trimmed === trimmed.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(trimmed)
  const isAllLower = trimmed === trimmed.toLowerCase()
  return isAllUpper || isAllLower ? toPascalCase(trimmed) : value
}

function createEmptyAddress() {
  return ADDRESS_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {})
}

function validateField(key, value, optional = false, existingLabels = []) {
  if (key === 'notes') {
    return validateReason(value, { required: false, label: 'Las notas' })
  }

  if (key === 'label') {
    const lengthError = validateBoundedText(value, {
      required: !optional,
      label: 'El nombre de la dirección',
    })
    if (lengthError) {
      return lengthError
    }
    return validateUnique(value, existingLabels, { label: 'El nombre de la dirección' })
  }

  if (key === 'address') {
    return validateAddressLine(value, { required: !optional })
  }

  return validateBoundedText(value, {
    required: !optional,
    label: 'Campo',
  })
}

export function AddressModal({ isOpen, onClose, onSave, existingAddresses = [] }) {
  const [draft, setDraft] = useState(createEmptyAddress)
  const [errors, setErrors] = useState({})
  const existingLabels = existingAddresses.map((entry) => entry?.label).filter(Boolean)

  const handleClose = () => {
    setDraft(createEmptyAddress())
    setErrors({})
    onClose()
  }

  const validate = () => {
    const next = {}
    ADDRESS_FIELDS.forEach(({ key, optional }) => {
      const message = validateField(key, draft[key], optional, existingLabels)
      if (message) {
        next[key] = message
      }
    })
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = () => {
    if (!validate()) {
      return
    }
    onSave({ id: `addr_${Date.now()}`, ...draft })
    setDraft(createEmptyAddress())
    setErrors({})
  }

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal((
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="auth-modal address-modal--overlay"
      backdropClassName="auth-modal-backdrop"
      labelledBy="address-modal-title"
    >
      <button
        type="button"
        className="auth-modal__close"
        onClick={handleClose}
        {...namedControl('Cerrar')}
      >
        ×
      </button>

      <div className="auth-modal__form-col address-modal--form">
        <h3 id="address-modal-title" className="auth-form__title">Nueva dirección</h3>
        <p className="auth-form__subtitle">Complete los campos para registrar la dirección</p>

        <div className="address-modal--fields">
          {ADDRESS_FIELDS.map(({ key, label, placeholder, optional, icon }) => (
            <div
              key={key}
              className="address-modal--field"
              onBlur={() => {
                setDraft((c) => {
                  const normalized = normalizeAddressField(c[key])
                  const message = validateField(key, normalized, optional, existingLabels)
                  setErrors((prev) => ({ ...prev, [key]: message || undefined }))
                  return { ...c, [key]: normalized }
                })
              }}
            >
              <label className="address-modal--label" htmlFor={`address-${key}`}>
                {optional ? `${label} (opcional)` : label}
              </label>
              <div className="address-modal--control">
                {icon ? (
                  <img
                    src={icon}
                    className="address-modal--icon"
                    {...namedImage(label)}
                  />
                ) : null}
                <input
                  id={`address-${key}`}
                  type="text"
                  className={`address-modal--input${errors[key] ? ' address-modal--input-error' : ''}`}
                  value={draft[key]}
                  placeholder={placeholder || ''}
                  maxLength={INPUT_CHAR_MAX}
                  onChange={(event) => {
                    const value = event.target.value
                    setDraft((c) => ({ ...c, [key]: value }))
                    const message = validateField(key, value, optional, existingLabels)
                    setErrors((c) => ({ ...c, [key]: message || undefined }))
                  }}
                  aria-invalid={Boolean(errors[key])}
                  {...namedControl(label)}
                />
              </div>
              {errors[key] && (
                <span className="auth-field__error">{errors[key]}</span>
              )}
            </div>
          ))}
        </div>

        <div className="auth-form__actions">
          <button
            type="button"
            className="auth-form__submit"
            onClick={handleSave}
            {...namedControl('Guardar dirección')}
          >
            Guardar dirección
          </button>
        </div>
      </div>
    </Modal>
  ), document.body)
}
