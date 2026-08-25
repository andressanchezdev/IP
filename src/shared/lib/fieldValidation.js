export const INPUT_CHAR_MIN = 10
export const INPUT_CHAR_MAX = 60

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function trimValue(value) {
  return String(value ?? '').trim()
}

/**
 * @param {unknown} value
 * @param {{ required?: boolean, min?: number, max?: number, label?: string }} [options]
 * @returns {string} Empty string when valid; otherwise an error message.
 */
export function validateBoundedText(value, {
  required = true,
  min = INPUT_CHAR_MIN,
  max = INPUT_CHAR_MAX,
  label = 'Campo',
} = {}) {
  const trimmed = trimValue(value)

  if (!trimmed) {
    return required ? `${label} es obligatorio` : ''
  }
  if (trimmed.length < min) {
    return `Mínimo ${min} caracteres`
  }
  if (trimmed.length > max) {
    return `Máximo ${max} caracteres`
  }

  return ''
}

/**
 * @param {unknown} value
 * @param {{ required?: boolean, label?: string }} [options]
 */
export function validateEmail(value, { required = true, label = 'El correo' } = {}) {
  const trimmed = trimValue(value)

  if (!trimmed) {
    return required ? `${label} es obligatorio` : ''
  }
  if (trimmed.length > INPUT_CHAR_MAX) {
    return `Máximo ${INPUT_CHAR_MAX} caracteres`
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Correo electrónico inválido'
  }

  return ''
}

/**
 * @param {unknown} value
 * @param {{ required?: boolean, label?: string }} [options]
 */
export function validatePhone(value, { required = true, label = 'El teléfono' } = {}) {
  const trimmed = trimValue(value)

  if (!trimmed) {
    return required ? `${label} es obligatorio` : ''
  }

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 10) {
    return 'Mínimo 10 dígitos'
  }
  if (trimmed.length > INPUT_CHAR_MAX) {
    return `Máximo ${INPUT_CHAR_MAX} caracteres`
  }

  return ''
}

/**
 * @param {unknown} value
 * @param {{ required?: boolean, label?: string }} [options]
 */
export function validatePersonName(value, { required = true, label = 'El nombre' } = {}) {
  return validateBoundedText(value, { required, label })
}

/**
 * @param {unknown} value
 * @param {{ required?: boolean, label?: string }} [options]
 */
export function validateAddressLine(value, { required = true, label = 'La dirección' } = {}) {
  return validateBoundedText(value, { required, label })
}

/**
 * @param {unknown} value
 * @param {unknown[]} existingValues
 * @param {{ label?: string, caseInsensitive?: boolean }} [options]
 */
export function validateUnique(value, existingValues, {
  label = 'Valor',
  caseInsensitive = true,
} = {}) {
  const trimmed = trimValue(value)
  if (!trimmed) {
    return ''
  }

  const normalize = (entry) => {
    const text = String(entry ?? '').trim()
    return caseInsensitive ? text.toLowerCase() : text
  }

  const target = normalize(trimmed)
  const isDuplicate = (existingValues ?? []).some((entry) => normalize(entry) === target)

  return isDuplicate ? `${label} ya existe` : ''
}

/**
 * Optional free-text reason/notes: empty allowed; when filled, 10–60 chars.
 * @param {unknown} value
 * @param {{ required?: boolean, label?: string }} [options]
 */
export function validateReason(value, { required = false, label = 'Las observaciones' } = {}) {
  return validateBoundedText(value, { required, label })
}
