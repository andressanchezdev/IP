import brandImage from '@/assets/images/Captura de pantalla 2026-08-05 090935.png'
import brandImageMobile from '@/assets/images/loginIpmovil.png'
import { Modal } from '@/shared/ui/Modal'
import { LoginForm } from './LoginForm'
import { namedControl } from '@/shared/lib/namedControl'
import './AuthModal.css'

export function AuthModal({ isOpen, onClose, onLogin }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="auth-modal-title"
      className="auth-modal auth-modal--login"
      backdropClassName="auth-modal-backdrop"
    >
      <button
        type="button"
        className="auth-modal__close"
        onClick={onClose}
        {...namedControl('Cerrar')}
      >
        ×
      </button>

      <div className="auth-modal__split">
        <div
          className="auth-modal__brand"
          style={{
            '--auth-brand-desktop': `url(${brandImage})`,
            '--auth-brand-mobile': `url(${brandImageMobile})`,
          }}
          role="img"
          {...namedControl('Importadora Premium Online')}
        />

        <div className="auth-modal__form-col">
          <LoginForm onSubmit={onLogin} />
        </div>
      </div>
    </Modal>
  )
}
