const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[\d\s+-]{7,15}$/
const DOCUMENT_REGEX = /^\d{6,12}$/

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

export function validateRegister(form) {
  const errors = {}

  if (!form.fullName.trim()) {
    errors.fullName = 'El nombre es obligatorio'
  } else if (form.fullName.trim().length < 3) {
    errors.fullName = 'Mínimo 3 caracteres'
  }

  if (!form.documentId.trim()) {
    errors.documentId = 'El documento es obligatorio'
  } else if (!DOCUMENT_REGEX.test(form.documentId.trim())) {
    errors.documentId = 'Documento numérico de 6 a 12 dígitos'
  }

  if (!form.phone.trim()) {
    errors.phone = 'El teléfono es obligatorio'
  } else if (!PHONE_REGEX.test(form.phone.trim())) {
    errors.phone = 'Teléfono inválido (7-15 dígitos)'
  }

  if (!form.email.trim()) {
    errors.email = 'El correo es obligatorio'
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = 'Correo electrónico inválido'
  }

  if (form.accountType === 'company') {
    if (!form.companyName.trim()) {
      errors.companyName = 'La empresa es obligatoria'
    }

    if (!form.nit.trim()) {
      errors.nit = 'El NIT es obligatorio'
    } else if (!/^[\d-]{5,15}$/.test(form.nit.trim())) {
      errors.nit = 'NIT inválido'
    }
  }

  if (!form.password) {
    errors.password = 'La contraseña es obligatoria'
  } else if (form.password.length < 6) {
    errors.password = 'Mínimo 6 caracteres'
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirma la contraseña'
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden'
  }

  return { isValid: Object.keys(errors).length === 0, errors }
}

export function validateField(field, form, mode = 'login') {
  const result = mode === 'login'
    ? validateLogin(form)
    : validateRegister(form)

  return result.errors[field] ?? ''
}
