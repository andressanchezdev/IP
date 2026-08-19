const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PASSWORD_RULES = [
  {
    id: 'length',
    label: 'Mínimo 8 caracteres',
    test: (password) => String(password ?? '').length >= 8,
  },
  {
    id: 'lower',
    label: 'Al menos una minúscula',
    test: (password) => /[a-záéíóúñ]/.test(String(password ?? '')),
  },
  {
    id: 'upper',
    label: 'Al menos una mayúscula',
    test: (password) => /[A-ZÁÉÍÓÚÑ]/.test(String(password ?? '')),
  },
  {
    id: 'number',
    label: 'Al menos un número',
    test: (password) => /\d/.test(String(password ?? '')),
  },
  {
    id: 'special',
    label: 'Al menos un carácter especial',
    test: (password) => /[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s]/.test(String(password ?? '')),
  },
]

export function getPasswordRuleStatus(password) {
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    ok: rule.test(password),
  }))
}

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

export function validateChangePassword({ currentPassword, newPassword, confirmPassword }) {
  const errors = {}
  const current = String(currentPassword ?? '')
  const next = String(newPassword ?? '')
  const confirm = String(confirmPassword ?? '')

  if (!current) {
    errors.currentPassword = 'La contraseña actual es obligatoria'
  }

  if (!next) {
    errors.newPassword = 'La nueva contraseña es obligatoria'
  } else {
    const failedRule = PASSWORD_RULES.find((rule) => !rule.test(next))
    if (failedRule) {
      errors.newPassword = failedRule.label
    } else if (current && next === current) {
      errors.newPassword = 'Debe ser distinta a la contraseña actual'
    }
  }

  if (!confirm) {
    errors.confirmPassword = 'Confirma la nueva contraseña'
  } else if (next && confirm !== next) {
    errors.confirmPassword = 'Las contraseñas no coinciden'
  }

  return { isValid: Object.keys(errors).length === 0, errors }
}

export function validateField(field, form) {
  return validateLogin(form).errors[field] ?? ''
}

export function validateChangePasswordField(field, form) {
  return validateChangePassword(form).errors[field] ?? ''
}
