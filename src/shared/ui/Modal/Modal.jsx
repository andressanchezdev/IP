import { useEffect } from 'react'
import { namedControl } from '@/shared/lib/namedControl'
import './Modal.css'

export function Modal({
  isOpen,
  onClose,
  labelledBy,
  className = '',
  backdropClassName = '',
  children,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div
        className={`modal-backdrop ${backdropClassName}`.trim()}
        onClick={onClose}
        {...namedControl('Cerrar')}
      />
      <div
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </>
  )
}
