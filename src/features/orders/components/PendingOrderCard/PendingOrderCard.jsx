import { memo, useEffect, useState } from 'react'
import esperaImage from '@/assets/images/espera.png'
import copyIcon from '@/assets/icons/copy.svg'
import shippingIcon from '@/assets/icons/shipping.svg'
import { useToast } from '@/app/providers/ToastProvider'
import { copyTextToClipboard } from '@/shared/lib/copyTextToClipboard'
import {
  getFlowStepLabel,
  getOrderStepIndex,
  ORDER_STEP_DEFS,
} from '@/features/orders/constants/orderSteps'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
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
  // API: data[].estado es string (ej. "verificacion"), no array.
  const currentStepIndex = getOrderStepIndex(order.status ?? order.estado)
  const currentStepLabel = getFlowStepLabel(currentStepIndex, currentStepIndex)

  const handleCopyId = async (event) => {
    event.stopPropagation()
    const copied = await copyTextToClipboard(order.id)
    showToast(copied ? 'ID del pedido copiado' : 'No se pudo copiar el ID', copied ? 'success' : 'error')
  }

  return (
    <article className="espera-card" data-order-estado={order.estado || ''} data-order-status={currentStepLabel}>
      <div className="espera-card__header">
        <div className="espera-card__header-info">
          <div className="espera-card__id-row">
            <h3 className="espera-card__id">{order.id}</h3>
            <button
              type="button"
              className="espera-card__copy-btn"
              onClick={handleCopyId}
              {...namedControl(`Copiar ID del pedido ${order.id}`)}
            >
              <img src={copyIcon} className="espera-card__copy-icon" {...namedImage('Copiar ID')} />
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
            {...namedControl(`Abrir detalle del pedido ${order.id}`)}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      <div className={`espera-card__body ${showVisual ? '' : 'espera-card__body--solo-flow'}`.trim()}>
        <div className="espera-card__flow-col">
          <span className="espera-card__col-label">Estado del pedido</span>
          <ul className="espera-card__flow">
            {ORDER_STEP_DEFS.map((stepDef, index) => {
              const isDone = index < currentStepIndex
              const isCurrent = index === currentStepIndex
              const label = getFlowStepLabel(index, currentStepIndex)

              return (
                <li
                  key={stepDef.key}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={[
                    'espera-card__flow-step',
                    isDone ? 'espera-card__flow-step--done' : '',
                    isCurrent ? 'espera-card__flow-step--current' : '',
                    !isDone && !isCurrent ? 'espera-card__flow-step--pending' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <span className="espera-card__flow-dot" aria-hidden="true" />
                  <span className="espera-card__flow-label">{label}</span>
                </li>
              )
            })}
          </ul>

          <p className="espera-card__dispatch-notice">
            <span className="espera-card__dispatch-notice-icon" aria-hidden="true">
              <img src={shippingIcon} {...namedImage('Despacho')} />
            </span>
            Su pedido está siendo procesado para su respectivo despacho
          </p>
        </div>

        {showVisual && (
          <div className="espera-card__visual">
            <img src={esperaImage} className="espera-card__image" loading="lazy" decoding="async" {...namedImage('Pedido en espera')} />
          </div>
        )}
      </div>
    </article>
  )
})
