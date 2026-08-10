import { useAuthForm } from '@/features/auth/hooks/useAuthForm'
import { AuthField } from './AuthField'

export function LoginForm({ onSubmit, onSwitchMode }) {
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
        id="auth-email"
        label="Correo"
        type="email"
        value={form.email}
        error={getError('email')}
        onChange={(value) => setField('email', value)}
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
