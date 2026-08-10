import brandImage from '@/assets/images/Captura de pantalla 2026-08-05 090935.png'
import { Modal } from '@/shared/ui/Modal'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import './AuthModal.css'

export function AuthModal({ isOpen, mode, onClose, onSwitchMode, onLogin, onRegister }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="auth-modal-title"
      className="auth-modal"
      backdropClassName="auth-modal-backdrop"
    >
      <button
        type="button"
        className="auth-modal__close"
        onClick={onClose}
        aria-label="Cerrar"
      >
        ×
      </button>

      <div className="auth-modal__split">
        <div
          className="auth-modal__brand"
          style={{ backgroundImage: `url(${brandImage})` }}
          role="img"
          aria-label="Importadora Premium Online"
        />

        <div className="auth-modal__form-col">
          {mode === 'login' ? (
            <LoginForm onSubmit={onLogin} onSwitchMode={onSwitchMode} />
          ) : (
            <RegisterForm onSubmit={onRegister} onSwitchMode={onSwitchMode} />
          )}
        </div>
      </div>
    </Modal>
  )
}
