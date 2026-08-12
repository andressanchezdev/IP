import { useState } from 'react'
import eyeIcon from '@/assets/icons/eye.svg'
import eyeOffIcon from '@/assets/icons/eye-off.svg'

export function SettingsField({ id, label, type = 'text', value, onChange, disabled = false }) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <label className="filter-drawer-field" htmlFor={id}>
      <span>
        {label}
        {disabled && <span className="profile-settings-field__lock"> · No editable</span>}
      </span>
      <div className="profile-settings-field__control">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          readOnly={disabled}
          className={isPassword ? 'profile-settings-field__input--password' : ''}
        />
        {isPassword && (
          <button
            type="button"
            className="profile-settings-field__toggle"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPassword}
          >
            <img
              src={showPassword ? eyeOffIcon : eyeIcon}
              alt=""
              className="profile-settings-field__toggle-icon"
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    </label>
  )
}
