import { useCallback, useState } from 'react'
import { validateField, validateLogin, validateRegister } from '../utils/authValidation'

const LOGIN_INITIAL = {
  username: '',
  password: '',
  rememberMe: false,
}

const REGISTER_INITIAL = {
  accountType: 'natural',
  fullName: '',
  documentId: '',
  phone: '',
  email: '',
  companyName: '',
  nit: '',
  password: '',
  confirmPassword: '',
}

export function useAuthForm(mode = 'login') {
  const [loginForm, setLoginForm] = useState(LOGIN_INITIAL)
  const [registerForm, setRegisterForm] = useState(REGISTER_INITIAL)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const form = mode === 'login' ? loginForm : registerForm

  const setField = useCallback((field, value) => {
    setTouched((current) => ({ ...current, [field]: true }))

    if (mode === 'login') {
      setLoginForm((current) => {
        const nextForm = { ...current, [field]: value }
        setErrors((prev) => {
          const message = validateField(field, nextForm, 'login')
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
      return
    }

    setRegisterForm((current) => {
      const nextForm = { ...current, [field]: value }
      setErrors((prev) => {
        const message = validateField(field, nextForm, 'register')
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
  }, [mode])

  const validateAll = useCallback(() => {
    const result = mode === 'login'
      ? validateLogin(loginForm)
      : validateRegister(registerForm)

    setErrors(result.errors)
    setTouched(
      Object.keys(mode === 'login' ? loginForm : registerForm).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {},
      ),
    )

    return result.isValid
  }, [mode, loginForm, registerForm])

  const reset = useCallback(() => {
    setLoginForm(LOGIN_INITIAL)
    setRegisterForm(REGISTER_INITIAL)
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
