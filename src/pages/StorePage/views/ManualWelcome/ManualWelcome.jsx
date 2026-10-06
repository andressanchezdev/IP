import { useCallback, useEffect, useMemo, useState } from 'react'
import { namedControl } from '@/shared/lib/namedControl'
import { Modal } from '@/shared/ui/Modal'
import '@/features/auth/components/AuthModal/AuthModal.css'
import {
  DrawerCheckRow,
  DrawerSectionBody,
  DrawerSectionList,
} from '@/shared/ui/DrawerShell/DrawerShell'
import './ManualWelcome.css'

const STORAGE_KEY = 'manual-cliente-ip-vistos'

const GROUPS = [
  { id: 'sesion', title: '¿Cómo puedo iniciar sesión?' },
  { id: 'inicio', title: '¿Cómo busco productos en el inicio?' },
  { id: 'carrito', title: '¿Cómo puedo agregar productos al carrito?' },
  { id: 'crear', title: '¿Cómo puedo crear mi pedido correctamente?' },
  { id: 'gestionar', title: '¿Cómo gestiono un pedido?' },
  { id: 'abono', title: '¿Cómo registro un abono o anticipo?' },
  { id: 'masivo', title: '¿Cómo subo un pedido masivo?' },
  { id: 'informacion', title: '¿Cómo puedo actualizar o gestionar mi información?' },
]

const STEPS = [
  {
    id: 'iniciar',
    groupId: 'sesion',
    question: '¿Cómo inicio sesión?',
    src: 'iniciosesion.mp4',
  },
  {
    id: 'buscar',
    groupId: 'inicio',
    question: '¿Cómo uso la barra de búsqueda?',
    src: 'usobarradebusqueda.mp4',
  },
  {
    id: 'filtros',
    groupId: 'inicio',
    question: '¿Cómo aplico filtros combinados?',
    src: 'filtrocombinado.mp4',
  },
  {
    id: 'agregar',
    groupId: 'carrito',
    question: '¿Cómo agrego un producto al carrito?',
    src: 'agregarproductocarrito.mp4',
  },
  {
    id: 'buscar-carrito',
    groupId: 'carrito',
    question: '¿Cómo busco un producto dentro del carrito?',
    src: 'buscaproductocarrito.mp4',
  },
  {
    id: 'cantidad',
    groupId: 'carrito',
    question: '¿Cómo modifico la cantidad en el carrito?',
    src: 'modificarcantidadencarrito.mp4',
  },
  {
    id: 'retirar',
    groupId: 'carrito',
    question: '¿Cómo retiro un producto del carrito?',
    src: 'retirarproductocarrito.mp4',
  },
  {
    id: 'limpiar',
    groupId: 'carrito',
    question: '¿Cómo limpio el carrito?',
    src: 'limpiarcarrito.mp4',
  },
  {
    id: 'crear-pedido',
    groupId: 'crear',
    question: '¿Cómo creo mi pedido correctamente?',
    src: 'crearpedido.mp4',
  },
  {
    id: 'gestionar-pedido',
    groupId: 'gestionar',
    question: '¿Cómo gestiono un pedido?',
    src: 'gestiondepedido.mp4',
  },
  {
    id: 'pago-pedido',
    groupId: 'abono',
    question: '¿Cómo creo un pago a un pedido?',
    src: 'crearpagoapedido.mp4',
  },
  {
    id: 'pago-cartera',
    groupId: 'abono',
    question: '¿Cómo creo un pago de pedido desde cartera?',
    src: 'crearpagopedidocartera.mp4',
  },
  {
    id: 'pedido-masivo',
    groupId: 'masivo',
    question: '¿Cómo gestiono un pedido masivo?',
    src: 'gestionsobreelpedido.mp4',
  },
  {
    id: 'informacion',
    groupId: 'informacion',
    question: '¿Cómo veo y gestiono mi información?',
    src: 'gestioninfousuario.mp4',
  },
  {
    id: 'cerrar',
    groupId: 'sesion',
    question: '¿Cómo cierro sesión?',
    src: 'cierresesion.mp4',
  },
]

function loadSeen() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
    return new Set(Array.isArray(saved) ? saved : [])
  } catch {
    return new Set()
  }
}

function markSeen(id) {
  const seen = loadSeen()
  if (seen.has(id)) {
    return
  }
  seen.add(id)
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]))
}

const TUTORIALES_URL = 'https://storage.googleapis.com/importadorapremiumonline/dependencias/tutoriales/'

function mediaUrl(src) {
  const file = src.split('/').pop()
  return `${TUTORIALES_URL}${encodeURIComponent(file)}`
}

function groupTitle(groupId) {
  return GROUPS.find((group) => group.id === groupId)?.title || ''
}

function stepsInGroup(groupId) {
  return STEPS.filter((step) => step.groupId === groupId)
}

function pathSteps(step, from) {
  if (from === 'tema') {
    return stepsInGroup(step.groupId)
  }
  return STEPS
}

function GuideColumn({ index, seen, activeStepId, onOpenStep }) {
  const step = STEPS[index] || STEPS[0]
  const isLast = index >= STEPS.length - 1
  const isPlaying = step.id === activeStepId

  return (
    <section className="manual-cliente__column" aria-label="Guía paso a paso explicativa">
      <div className="manual-cliente__column-head">
        <h2>Guía paso a paso explicativa</h2>
        <p>Un punto a la vez. Al terminar, pasa al siguiente.</p>
      </div>
      <ol className="manual-cliente__rail">
        {STEPS.map((item, itemIndex) => (
          <li key={item.id}>
            <button
              type="button"
              className={[
                'manual-cliente__rail-point',
                itemIndex === index ? 'manual-cliente__rail-point--current' : '',
                seen.has(item.id) ? 'manual-cliente__rail-point--seen' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onOpenStep(item, 'guia')}
              {...namedControl(`Paso ${itemIndex + 1}`)}
            >
              {itemIndex + 1}
            </button>
          </li>
        ))}
      </ol>
      <div className={`manual-cliente__point${isPlaying ? ' manual-cliente__point--active' : ''}`}>
        <p className="lesson__kicker">Paso {index + 1} de {STEPS.length}</p>
        <h3>{step.question}</h3>
        {seen.has(step.id) ? <span className="pill">Visto</span> : null}
      </div>
      <div className="manual-cliente__point-actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => onOpenStep(step, 'guia')}
          disabled={isPlaying}
        >
          {isPlaying ? 'En reproducción' : 'Ver este paso'}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => onOpenStep(STEPS[index + 1], 'guia')}
          disabled={isLast}
        >
          Siguiente
        </button>
      </div>
    </section>
  )
}

function TopicColumn({
  title,
  hint,
  openGroupId,
  onToggleGroup,
  activeStepId,
  seen,
  from,
  onOpenStep,
}) {
  return (
    <section className="manual-cliente__column" aria-label={title}>
      <div className="manual-cliente__column-head">
        <h2>{title}</h2>
        <p>{hint}</p>
      </div>
      <DrawerSectionList>
        {GROUPS.map((group) => {
          const isOpen = openGroupId === group.id
          const steps = stepsInGroup(group.id)
          return (
            <div className="manual-cliente__section" key={`${from}-${group.id}`}>
              <DrawerCheckRow
                active={isOpen}
                label={group.title}
                onClick={() => onToggleGroup(group.id)}
              >
                <span className="manual-cliente__section-label">{group.title}</span>
                <span
                  className={`filter-drawer-check__caret${isOpen ? ' filter-drawer-check__caret--open' : ''}`}
                  aria-hidden="true"
                />
              </DrawerCheckRow>
              {isOpen ? (
                <DrawerSectionBody>
                  {steps.map((step) => {
                    const isActive = step.id === activeStepId
                    return (
                      <button
                        key={step.id}
                        type="button"
                        className={`manual-cliente__lesson${isActive ? ' manual-cliente__lesson--active' : ''}`}
                        onClick={() => onOpenStep(step, from)}
                      >
                        <span className="step__question">{step.question}</span>
                        {seen.has(step.id) ? <span className="pill">Visto</span> : null}
                      </button>
                    )
                  })}
                </DrawerSectionBody>
              ) : null}
            </div>
          )
        })}
      </DrawerSectionList>
    </section>
  )
}

export function ManualWelcome() {
  const [guideIndex, setGuideIndex] = useState(0)
  const [openTopicId, setOpenTopicId] = useState(null)
  const [active, setActive] = useState(null)
  const [seenVersion, setSeenVersion] = useState(0)
  const [videoError, setVideoError] = useState(false)
  const seen = useMemo(() => loadSeen(), [seenVersion])
  const activeStep = STEPS.find((step) => step.id === active?.id) || null
  const watched = STEPS.filter((step) => seen.has(step.id)).length
  const percent = Math.round((watched / STEPS.length) * 100)

  useEffect(() => {
    setVideoError(false)
  }, [active?.id])

  const closeVideo = useCallback(() => {
    setActive(null)
  }, [])

  const openStep = (step, from) => {
    setActive({ id: step.id, from })
    if (from === 'guia') {
      const nextIndex = STEPS.findIndex((item) => item.id === step.id)
      setGuideIndex(nextIndex >= 0 ? nextIndex : 0)
      return
    }
    setOpenTopicId(step.groupId)
  }

  const handleComeback = () => {
    if (!activeStep || !active) {
      return
    }
    const list = pathSteps(activeStep, active.from)
    const index = list.findIndex((step) => step.id === activeStep.id)
    if (index <= 0) {
      setActive(null)
      return
    }
    openStep(list[index - 1], active.from)
  }

  const handleClose = () => {
    setActive(null)
    setGuideIndex(0)
    setOpenTopicId(null)
  }

  const toggleGroup = (current, setCurrent, groupId) => {
    setCurrent(current === groupId ? null : groupId)
  }

  return (
    <div className="manual-cliente">
      <header className="manual-cliente__header">
        <button
          type="button"
          className="manual-cliente__icon-btn"
          onClick={handleComeback}
          disabled={!activeStep}
          {...namedControl('Volver')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="manual-cliente__header-copy">
          <h1>Bienvenido Importadora Premium | cliente.</h1>
          <p className="lead">
            Guia de introduccion para utilizar el software de cliente premium.
          </p>
          <div className="progress">
            <div className="progress__track">
              <div className="progress__bar" style={{ width: `${percent}%` }} />
            </div>
            <div className="manual-cliente__header-line">
            <span>{watched}/{STEPS.length} · {percent}% Realizado </span>
          </div>
          </div>
        </div>
        <button
          type="button"
          className="manual-cliente__icon-btn manual-cliente__icon-btn--close"
          onClick={handleClose}
          disabled={!activeStep && guideIndex === 0 && !openTopicId}
          {...namedControl('Cerrar')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <Modal
        isOpen={Boolean(activeStep)}
        onClose={closeVideo}
        labelledBy="manual-video-title"
        className="auth-modal manual-video-modal"
        backdropClassName="auth-modal-backdrop"
      >
        <button
          type="button"
          className="auth-modal__close"
          onClick={closeVideo}
          {...namedControl('Cerrar video')}
        >
          ×
        </button>
        <div className="auth-modal__form-col manual-video-modal__body">
          <h2 id="manual-video-title">{activeStep?.question}</h2>
          <div className="player">
            {videoError ? (
              <p className="player__error">No se pudo cargar el video. Revisa que el archivo siga en la carpeta de tutoriales.</p>
            ) : (
              <div className="metadatacontainer">
                <div className="metadata">
                  <video
                    key={activeStep?.id}
                    autoPlay
                    controls
                    playsInline
                    aria-label={activeStep?.question}
                    src={activeStep ? mediaUrl(activeStep.src) : undefined}
                    onPlay={() => {
                      markSeen(activeStep.id)
                      setSeenVersion((version) => version + 1)
                    }}
                    onError={() => setVideoError(true)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <div className="manual-cliente__columns">
        <GuideColumn
          index={guideIndex}
          seen={seen}
          activeStepId={active?.from === 'guia' ? activeStep?.id : null}
          onOpenStep={openStep}
        />
        <TopicColumn
          title="Por tema o pregunta frecuente"
          hint="Abre solo la pregunta que necesitas."
          openGroupId={openTopicId}
          onToggleGroup={(groupId) => toggleGroup(openTopicId, setOpenTopicId, groupId)}
          activeStepId={activeStep?.id}
          seen={seen}
          from="tema"
          onOpenStep={openStep}
        />
      </div>
    </div>
  )
}
