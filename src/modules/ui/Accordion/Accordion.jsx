import { useId, useState } from 'react'
import './Accordion.css'

export function Accordion({
  title,
  children,
  defaultOpen = false,
  isOpen: controlledOpen,
  onToggle,
  className = '',
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const panelId = useId()
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.(!controlledOpen)
      return
    }
    setInternalOpen((prev) => !prev)
  }

  return (
    <div className={`accordion ${isOpen ? 'accordion--open' : ''} ${className}`.trim()}>
      <button
        type="button"
        className="accordion__trigger"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <span className="accordion__title">{title}</span>
        <span className="accordion__icon" aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div id={panelId} className="accordion__panel" role="region">
          {children}
        </div>
      )}
    </div>
  )
}
