import { useEffect, useState } from 'react'
import brandImage from '../../../assets/images/Captura de pantalla 2026-08-05 090935.png'
import { useAuthForm } from '../../../hooks/useAuthForm'
import eyeIcon from '../../../assets/icons/eye.svg'
import eyeOffIcon from '../../../assets/icons/eye-off.svg'
import './AuthModal.css'

function AuthField({ id, label, type = 'text', value, error, onChange }) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <label className="auth-field" htmlFor={id}>
      <span className="auth-field__label">{label}</span>
      <div className="auth-field__control">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`auth-field__input ${isPassword ? 'auth-field__input--password' : ''} ${error ? 'auth-field__input--error' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-field__toggle"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPassword}
          >
            <img
              src={showPassword ? eyeOffIcon : eyeIcon}
              alt=""
              className="auth-field__toggle-icon"
              aria-hidden="true"
            />
          </button>
        )}
      </div>
      {error && (
        <span id={`${id}-error`} className="auth-field__error" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

function LoginForm({ onSubmit, onSwitchMode }) {
  const { form, setField, validateAll, getError } = useAuthForm('login')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validateAll()) {
      return
    }
    onSubmit(form)
  }

  return (
    <form className="auth-form auth-form--login" onSubmit={handleSubmit} noValidate>
      <h2 className="auth-form__title">Ingresar</h2>
      <p className="auth-form__subtitle">Accede a tu cuenta de Importadora Premium</p>

      <AuthField
        id="auth-username"
        label="Usuario"
        value={form.username}
        error={getError('username')}
        onChange={(value) => setField('username', value)}
      />
      <AuthField
        id="auth-password"
        label="Contraseña"
        type="password"
        value={form.password}
        error={getError('password')}
        onChange={(value) => setField('password', value)}
      />

      <label className="auth-form__remember">
        <input
          type="checkbox"
          checked={form.rememberMe}
          onChange={(event) => setField('rememberMe', event.target.checked)}
        />
        <span>Recordarme</span>
      </label>

      <div className="auth-form__actions">
        <button type="submit" className="auth-form__submit">
          Ingresar
        </button>
        <button type="button" className="auth-form__secondary" onClick={onSwitchMode}>
          Registrarme
        </button>
      </div>
    </form>
  )
}

function RegisterForm({ onSubmit, onSwitchMode }) {
  const { form, setField, validateAll, getError } = useAuthForm('register')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validateAll()) {
      return
    }
    onSubmit(form)
  }

  return (
    <form className="auth-form auth-form--register" onSubmit={handleSubmit} noValidate>
      <h2 className="auth-form__title">Registrarme</h2>

      <fieldset className="auth-form__account-type">
        <legend>Tipo de persona</legend>
        <div className="auth-form__account-options">
          <label className={`auth-form__account-option ${form.accountType === 'natural' ? 'auth-form__account-option--active' : ''}`}>
            <input
              type="radio"
              name="accountType"
              value="natural"
              checked={form.accountType === 'natural'}
              onChange={(event) => setField('accountType', event.target.value)}
            />
            Persona natural
          </label>
          <label className={`auth-form__account-option ${form.accountType === 'company' ? 'auth-form__account-option--active' : ''}`}>
            <input
              type="radio"
              name="accountType"
              value="company"
              checked={form.accountType === 'company'}
              onChange={(event) => setField('accountType', event.target.value)}
            />
            Empresa
          </label>
        </div>
      </fieldset>

      <div className="auth-form__grid">
        <div className="auth-form__column">
          <AuthField
            id="reg-fullName"
            label="Nombre completo"
            value={form.fullName}
            error={getError('fullName')}
            onChange={(value) => setField('fullName', value)}
          />
          <AuthField
            id="reg-documentId"
            label="Documento"
            value={form.documentId}
            error={getError('documentId')}
            onChange={(value) => setField('documentId', value)}
          />
          <AuthField
            id="reg-phone"
            label="Teléfono"
            type="tel"
            value={form.phone}
            error={getError('phone')}
            onChange={(value) => setField('phone', value)}
          />
          <AuthField
            id="reg-email"
            label="Correo"
            type="email"
            value={form.email}
            error={getError('email')}
            onChange={(value) => setField('email', value)}
          />
        </div>
        <div className="auth-form__column">
          {form.accountType === 'company' && (
            <>
              <AuthField
                id="reg-companyName"
                label="Razón social"
                value={form.companyName}
                error={getError('companyName')}
                onChange={(value) => setField('companyName', value)}
              />
              <AuthField
                id="reg-nit"
                label="NIT"
                value={form.nit}
                error={getError('nit')}
                onChange={(value) => setField('nit', value)}
              />
            </>
          )}
          <AuthField
            id="reg-password"
            label="Contraseña"
            type="password"
            value={form.password}
            error={getError('password')}
            onChange={(value) => setField('password', value)}
          />
          <AuthField
            id="reg-confirmPassword"
            label="Confirmar contraseña"
            type="password"
            value={form.confirmPassword}
            error={getError('confirmPassword')}
            onChange={(value) => setField('confirmPassword', value)}
          />
        </div>
      </div>

      <div className="auth-form__actions auth-form__actions--register">
        <button type="submit" className="auth-form__submit">
          Crear cuenta
        </button>
        <button type="button" className="auth-form__secondary" onClick={onSwitchMode}>
          Ya tengo cuenta
        </button>
      </div>
    </form>
  )
}

export function AuthModal({ isOpen, mode, onClose, onSwitchMode, onLogin, onRegister }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div className="auth-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          type="button"
          className="auth-modal__close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="auth-modal__split">
          <div
            className="auth-modal__brand"
            style={{ backgroundImage: `url(${brandImage})` }}
            role="img"
            aria-label="Importadora Premium Online"
          />

          <div className="auth-modal__form-col">
            {mode === 'login' ? (
              <LoginForm onSubmit={onLogin} onSwitchMode={onSwitchMode} />
            ) : (
              <RegisterForm onSubmit={onRegister} onSwitchMode={onSwitchMode} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
