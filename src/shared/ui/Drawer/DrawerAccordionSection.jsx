import { useEffect, useRef } from 'react'

export function DrawerAccordionSection({ id, title, isOpen, onToggle, onClose, children }) {
  const sectionRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !onClose) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (sectionRef.current?.contains(event.target)) {
        return
      }

      if (event.target.closest('.order-accordion__trigger')) {
        return
      }

      onClose(id)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen, id, onClose])

  return (
    <div
      ref={sectionRef}
      className={`order-accordion__section ${isOpen ? 'order-accordion__section--open' : ''}`}
    >
      <button
        type="button"
        className="order-accordion__trigger"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        aria-controls={`drawer-accordion-panel-${id}`}
      >
        <span>{title}</span>
        <span
          className={`order-accordion__chevron${isOpen ? ' order-accordion__chevron--open' : ''}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div
          id={`drawer-accordion-panel-${id}`}
          className="order-accordion__panel"
          role="region"
          aria-label={title}
        >
          {children}
        </div>
      )}
    </div>
  )
}
