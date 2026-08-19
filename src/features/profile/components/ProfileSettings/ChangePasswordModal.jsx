import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '@/shared/ui/Modal/Modal'
import { AuthField } from '@/features/auth/components/AuthModal/AuthField'
import {
  getPasswordRuleStatus,
  validateChangePassword,
  validateChangePasswordField,
} from '@/features/auth/utils/authValidation'
import { namedControl } from '@/shared/lib/namedControl'
import '@/features/auth/components/AuthModal/AuthModal.css'

const INITIAL_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export function ChangePasswordModal({ isOpen, onClose, onConfirm }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setForm(INITIAL_FORM)
    setErrors({})
    setTouched({})
    setSubmitting(false)
  }, [isOpen])

  const setField = useCallback((field, value) => {
    setTouched((current) => ({ ...current, [field]: true }))
    setForm((current) => {
      const nextForm = { ...current, [field]: value }
      setErrors((prev) => {
        const nextErrors = { ...prev }
        const fieldsToCheck = field === 'newPassword' || field === 'confirmPassword'
          ? ['newPassword', 'confirmPassword']
          : [field]

        fieldsToCheck.forEach((key) => {
          const message = validateChangePasswordField(key, nextForm)
          if (message) {
            nextErrors[key] = message
          } else {
            delete nextErrors[key]
          }
        })

        return nextErrors
      })
      return nextForm
    })
  }, [])

  const getError = useCallback(
    (field) => (touched[field] ? errors[field] : ''),
    [errors, touched],
  )

  const handleClose = () => {
    if (submitting) {
      return
    }
    onClose()
  }

  const handleConfirm = async (event) => {
    event.preventDefault()
    const result = validateChangePassword(form)
    setErrors(result.errors)
    setTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    })

    if (!result.isValid) {
      return
    }

    setSubmitting(true)
    try {
      await onConfirm?.(form)
      onClose()
    } catch (error) {
      setErrors((current) => ({
        ...current,
        currentPassword: error?.message || 'No se pudo actualizar la contraseña',
      }))
    } finally {
      setSubmitting(false)
    }
  }

  const ruleStatus = getPasswordRuleStatus(form.newPassword)

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal((
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="auth-modal change-password-modal"
      backdropClassName="auth-modal-backdrop"
      labelledBy="change-password-modal-title"
    >
      <button
        type="button"
        className="auth-modal__close"
        onClick={handleClose}
        disabled={submitting}
        {...namedControl('Cerrar')}
      >
        ×
      </button>

      <form
        className="auth-modal__form-col auth-form change-password-modal__form"
        onSubmit={handleConfirm}
        noValidate
      >
        <header className="change-password-modal__header">
          <h2 id="change-password-modal-title" className="auth-form__title">
            Actualizar contraseña
          </h2>
          <p className="auth-form__subtitle">
            Ingresa tu clave actual y define una nueva contraseña segura
          </p>
        </header>

        <div className="change-password-modal__body">
          <AuthField
            id="change-password-current"
            label="Contraseña actual"
            type="password"
            value={form.currentPassword}
            error={getError('currentPassword')}
            onChange={(value) => setField('currentPassword', value)}
          />
          <AuthField
            id="change-password-new"
            label="Nueva contraseña"
            type="password"
            value={form.newPassword}
            error={getError('newPassword')}
            onChange={(value) => setField('newPassword', value)}
          />

          <ul className="change-password-modal__rules" aria-label="Requisitos de contraseña">
            {ruleStatus.map((rule) => (
              <li
                key={rule.id}
                className={`change-password-modal__rule${rule.ok ? ' change-password-modal__rule--ok' : ''}`}
              >
                {rule.label}
              </li>
            ))}
          </ul>

          <AuthField
            id="change-password-confirm"
            label="Confirmar contraseña"
            type="password"
            value={form.confirmPassword}
            error={getError('confirmPassword')}
            onChange={(value) => setField('confirmPassword', value)}
          />
        </div>

        <footer className="auth-form__actions auth-form__actions--row change-password-modal__footer">
          <button
            type="button"
            className="auth-form__cancel"
            onClick={handleClose}
            disabled={submitting}
            {...namedControl('Cancelar')}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="auth-form__submit"
            disabled={submitting}
            {...namedControl('Confirmar')}
          >
            {submitting ? 'Actualizando…' : 'Confirmar'}
          </button>
        </footer>
      </form>
    </Modal>
  ), document.body)
}
