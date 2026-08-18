import { useAuthForm } from '@/features/auth/hooks/useAuthForm'
import { AuthField } from './AuthField'
import { namedControl } from '@/shared/lib/namedControl'

export function LoginForm({ onSubmit }) {
  const { form, setField, validateAll, getError } = useAuthForm()

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!validateAll()) {
      return
    }
    onSubmit(form)
  }

  return (
    <form className="auth-form auth-form--login" onSubmit={handleSubmit} noValidate>
      <h2 id="auth-modal-title" className="auth-form__title">Ingresar</h2>
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
          {...namedControl('Recordarme')}
        />
        <span>Recordarme</span>
      </label>

      <div className="auth-form__actions">
        <button type="submit" className="auth-form__submit" {...namedControl('Ingresar')}>
          Ingresar
        </button>
      </div>
    </form>
  )
}
