import { memo, useEffect, useState } from 'react'
import esperaImage from '../../../assets/images/espera.png'
import copyIcon from '../../../assets/icons/copy.svg'
import shippingIcon from '../../../assets/icons/shipping.svg'
import { useToast } from '../../../context/ToastContext'
import { copyTextToClipboard } from '../../../utils/copyTextToClipboard'
import { ORDER_STEPS } from '../constants/orderSteps'
import './PendingOrderCard.css'

const DESKTOP_VISUAL_QUERY = '(min-width: 769px)'

function formatOrderDate(value) {
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(price) {
  return `$${price.toLocaleString('es-CO')}`
}

export function useShowEsperaVisual() {
  const [showVisual, setShowVisual] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia(DESKTOP_VISUAL_QUERY).matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_VISUAL_QUERY)
    const syncVisual = () => setShowVisual(mediaQuery.matches)

    syncVisual()
    mediaQuery.addEventListener('change', syncVisual)
    return () => mediaQuery.removeEventListener('change', syncVisual)
  }, [])

  return showVisual
}

export const PendingOrderCard = memo(function PendingOrderCard({
  order,
  onOpenOrder,
  showVisual = true,
}) {
  const { showToast } = useToast()
  const currentStepIndex = ORDER_STEPS.indexOf(order.status)

  const handleCopyId = async (event) => {
    event.stopPropagation()
    const copied = await copyTextToClipboard(order.id)
    showToast(copied ? 'ID del pedido copiado' : 'No se pudo copiar el ID', copied ? 'success' : 'error')
  }

  return (
    <article className="espera-card">
      <div className="espera-card__header">
        <div className="espera-card__header-info">
          <div className="espera-card__id-row">
            <h3 className="espera-card__id">{order.id}</h3>
            <button
              type="button"
              className="espera-card__copy-btn"
              onClick={handleCopyId}
              aria-label={`Copiar ID del pedido ${order.id}`}
              title="Copiar ID"
            >
              <img src={copyIcon} alt="" className="espera-card__copy-icon" aria-hidden="true" />
            </button>
          </div>
          <p className="espera-card__date">{formatOrderDate(order.createdAt)}</p>
        </div>
        <div className="espera-card__header-actions">
          <span className="espera-card__total">{formatPrice(order.total)}</span>
          <button
            type="button"
            className="espera-card__add-btn"
            onClick={() => onOpenOrder?.(order.id)}
            aria-label="Agregar productos"
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      <div className={`espera-card__body ${showVisual ? '' : 'espera-card__body--solo-flow'}`.trim()}>
        <div className="espera-card__flow-col">
          <span className="espera-card__col-label">Estado del pedido</span>
          <ul className="espera-card__flow">
            {ORDER_STEPS.map((step, index) => {
              const isDone = currentStepIndex >= 0 && index < currentStepIndex
              const isCurrent = order.status === step

              return (
                <li
                  key={step}
                  className={`espera-card__flow-step ${isDone ? 'espera-card__flow-step--done' : ''} ${isCurrent ? 'espera-card__flow-step--current' : ''} ${!isDone && !isCurrent ? 'espera-card__flow-step--pending' : ''}`}
                >
                  <span className="espera-card__flow-dot" aria-hidden="true" />
                  <span className="espera-card__flow-label">{step}</span>
                </li>
              )
            })}
          </ul>

          <p className="espera-card__dispatch-notice">
            <span className="espera-card__dispatch-notice-icon" aria-hidden="true">
              <img src={shippingIcon} alt="" />
            </span>
            Su pedido está siendo procesado para su respectivo despacho
          </p>
        </div>

        {showVisual && (
          <div className="espera-card__visual">
            <img src={esperaImage} alt="" className="espera-card__image" aria-hidden="true" loading="lazy" decoding="async" />
          </div>
        )}
      </div>
    </article>
  )
})
