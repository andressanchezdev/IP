import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import {
  HOVER_ZOOM,
  ORIGIN_TOP_LEFT,
  REST_TRANSFORM,
  formatMagnifyTransform,
  panTargetFromPointer,
  stepPanToward,
} from './magnifyConstants'
import './ProductImageMagnify.css'

const MOBILE_MQ = '(max-width: 768px)'

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false
  ))

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MQ)
    const sync = () => setIsMobile(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  return isMobile
}

/**
 * Desktop: hover lupa + click lightbox.
 * Móvil (≤768px): sin lupa; tap abre lightbox.
 */
export function ProductImageMagnify({ src, alt }) {
  const isMobile = useIsMobileViewport()
  const hostRef = useRef(null)
  const mediaRef = useRef(null)
  const currentPanRef = useRef({ x: 0, y: 0 })
  const targetPanRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const hoveringRef = useRef(false)
  const rafRef = useRef(0)
  const lastTsRef = useRef(0)
  const [hovering, setHovering] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const writeMediaTransform = useCallback(() => {
    const media = mediaRef.current
    if (!media) {
      return
    }
    media.style.transformOrigin = ORIGIN_TOP_LEFT
    media.style.transform = formatMagnifyTransform(
      currentPanRef.current.x,
      currentPanRef.current.y,
      scaleRef.current,
    )
  }, [])

  const stopPanLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    lastTsRef.current = 0
  }, [])

  const startPanLoop = useCallback(() => {
    if (rafRef.current) {
      return
    }

    const tick = (timestamp) => {
      const lastTs = lastTsRef.current
      const dt = lastTs ? Math.min(0.032, (timestamp - lastTs) / 1000) : 0
      lastTsRef.current = timestamp

      const next = stepPanToward(currentPanRef.current, targetPanRef.current, dt)
      currentPanRef.current = { x: next.x, y: next.y }
      writeMediaTransform()

      const shouldRun = hoveringRef.current || !next.arrived
      if (shouldRun) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      rafRef.current = 0
      lastTsRef.current = 0
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [writeMediaTransform])

  const resetHoverZoom = useCallback(() => {
    hoveringRef.current = false
    stopPanLoop()
    currentPanRef.current = { x: 0, y: 0 }
    targetPanRef.current = { x: 0, y: 0 }
    scaleRef.current = 1
    const media = mediaRef.current
    if (!media) {
      return
    }
    media.style.transform = REST_TRANSFORM
    media.style.transformOrigin = ORIGIN_TOP_LEFT
  }, [stopPanLoop])

  const aimPanFromPointer = useCallback((clientX, clientY) => {
    const host = hostRef.current
    if (!host || lightboxOpen || isMobile) {
      return
    }
    const rect = host.getBoundingClientRect()
    targetPanRef.current = panTargetFromPointer(
      clientX - rect.left,
      clientY - rect.top,
      rect.width,
      rect.height,
      HOVER_ZOOM,
    )
    scaleRef.current = HOVER_ZOOM
    startPanLoop()
  }, [lightboxOpen, isMobile, startPanLoop])

  const handlePointerEnter = (event) => {
    if (isMobile || lightboxOpen) {
      return
    }
    hoveringRef.current = true
    setHovering(true)
    aimPanFromPointer(event.clientX, event.clientY)
  }

  const handlePointerMove = (event) => {
    if (isMobile || !hoveringRef.current || lightboxOpen) {
      return
    }
    aimPanFromPointer(event.clientX, event.clientY)
  }

  const handlePointerLeave = (event) => {
    if (isMobile) {
      return
    }
    const host = hostRef.current
    const next = event.relatedTarget
    if (host && next instanceof Node && host.contains(next)) {
      return
    }
    setHovering(false)
    resetHoverZoom()
  }

  const openLightbox = () => {
    setHovering(false)
    resetHoverZoom()
    setLightboxOpen(true)
  }

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
  }, [])

  useEffect(() => {
    setHovering(false)
    setLightboxOpen(false)
    resetHoverZoom()
  }, [src, isMobile, resetHoverZoom])

  useEffect(() => () => stopPanLoop(), [stopPanLoop])

  useEffect(() => {
    if (!lightboxOpen) {
      return undefined
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeLightbox()
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [lightboxOpen, closeLightbox])

  if (!src) {
    return <div className="product-magnify__empty" aria-hidden="true" />
  }

  if (isMobile) {
    return (
      <>
        <div
          className="product-magnify product-magnify--static"
          onClick={openLightbox}
        >
          <img
            src={src}
            className="product-magnify__media"
            draggable={false}
            {...namedImage(alt || 'Producto')}
          />
        </div>

        {lightboxOpen
          ? createPortal(
              <div
                className="product-magnify-lightbox"
                role="dialog"
                aria-modal="true"
                {...namedControl(`Vista ampliada de ${alt || 'producto'}`)}
                onClick={closeLightbox}
              >
                <button
                  type="button"
                  className="product-magnify-lightbox__close"
                  onClick={(event) => {
                    event.stopPropagation()
                    closeLightbox()
                  }}
                  {...namedControl('Cerrar vista ampliada')}
                >
                  ×
                </button>
                <img
                  src={src}
                  className="product-magnify-lightbox__image"
                  draggable={false}
                  onClick={(event) => event.stopPropagation()}
                  {...namedImage(alt || 'Producto')}
                />
              </div>,
              document.body,
            )
          : null}
      </>
    )
  }

  return (
    <>
      <div
        ref={hostRef}
        className={`product-magnify${hovering && !lightboxOpen ? ' is-zooming' : ''}`}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={openLightbox}
      >
        <img
          ref={mediaRef}
          src={src}
          className="product-magnify__media"
          draggable={false}
          {...namedImage(alt || 'Producto')}
        />
      </div>

      {lightboxOpen
        ? createPortal(
            <div
              className="product-magnify-lightbox"
              role="dialog"
              aria-modal="true"
              {...namedControl(`Vista ampliada de ${alt || 'producto'}`)}
              onClick={closeLightbox}
            >
              <button
                type="button"
                className="product-magnify-lightbox__close"
                onClick={(event) => {
                  event.stopPropagation()
                  closeLightbox()
                }}
                {...namedControl('Cerrar vista ampliada')}
              >
                ×
              </button>
              <img
                src={src}
                className="product-magnify-lightbox__image"
                draggable={false}
                onClick={(event) => event.stopPropagation()}
                {...namedImage(alt || 'Producto')}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
