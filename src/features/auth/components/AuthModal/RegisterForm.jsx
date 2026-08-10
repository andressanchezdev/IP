import { useAuthForm } from '@/features/auth/hooks/useAuthForm'
import { AuthField } from './AuthField'

export function RegisterForm({ onSubmit, onSwitchMode }) {
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
