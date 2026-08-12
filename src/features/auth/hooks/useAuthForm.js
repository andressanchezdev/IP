import { useCallback, useState } from 'react'
import { validateField, validateLogin } from '@/features/auth/utils/authValidation'

const LOGIN_INITIAL = {
  email: '',
  password: '',
  rememberMe: false,
}

export function useAuthForm() {
  const [form, setForm] = useState(LOGIN_INITIAL)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const setField = useCallback((field, value) => {
    setTouched((current) => ({ ...current, [field]: true }))

    setForm((current) => {
      const nextForm = { ...current, [field]: value }
      setErrors((prev) => {
        const message = validateField(field, nextForm)
        const nextErrors = { ...prev }
        if (message) {
          nextErrors[field] = message
        } else {
          delete nextErrors[field]
        }
        return nextErrors
      })
      return nextForm
    })
  }, [])

  const validateAll = useCallback(() => {
    const result = validateLogin(form)

    setErrors(result.errors)
    setTouched(
      Object.keys(form).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
    )

    return result.isValid
  }, [form])

  const reset = useCallback(() => {
    setForm(LOGIN_INITIAL)
    setErrors({})
    setTouched({})
  }, [])

  const getError = useCallback(
    (field) => (touched[field] ? errors[field] : ''),
    [errors, touched],
  )

  return {
    form,
    setField,
    validateAll,
    reset,
    getError,
    errors,
  }
}
