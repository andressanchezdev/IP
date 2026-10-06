/** Texto en mayúsculas con reglas del español (ñ → Ñ). Sin dependencias: se prueba con node --test. */
export function toUpperText(value) {
  return String(value ?? '').trim().toLocaleUpperCase('es')
}

/**
 * Copia del body con los campos de texto indicados en mayúsculas.
 * Solo toca valores string de la lista: las claves y los números no cambian.
 */
export function upperStringFields(body = {}, fields = []) {
  const next = { ...body }
  fields.forEach((field) => {
    if (typeof next[field] === 'string') {
      next[field] = toUpperText(next[field])
    }
  })
  return next
}
