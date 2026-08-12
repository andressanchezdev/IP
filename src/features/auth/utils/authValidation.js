const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLogin({ email, password }) {
  const errors = {}
  const trimmedEmail = String(email ?? '').trim()

  if (!trimmedEmail) {
    errors.email = 'El correo es obligatorio'
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = 'Correo electrónico inválido'
  }

  if (!password) {
    errors.password = 'La contraseña es obligatoria'
  } else if (password.length < 6) {
    errors.password = 'Mínimo 6 caracteres'
  }

  return { isValid: Object.keys(errors).length === 0, errors }
}

export function validateField(field, form) {
  return validateLogin(form).errors[field] ?? ''
}
