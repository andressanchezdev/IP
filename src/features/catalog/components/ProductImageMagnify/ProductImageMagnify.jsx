import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import { HOVER_ZOOM, ORIGIN_CENTER, originFromPointer } from './magnifyConstants'
import './ProductImageMagnify.css'

/**
 * Zoom de contenedor al hover (origin sigue al puntero) + lightbox al click.
 */
export function ProductImageMagnify({ src, alt }) {
  const hostRef = useRef(null)
  const mediaRef = useRef(null)
  const [hovering, setHovering] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const resetHoverZoom = useCallback(() => {
    const media = mediaRef.current
    if (!media) {
      return
    }
    media.style.transform = 'scale(1)'
    media.style.transformOrigin = ORIGIN_CENTER
  }, [])

  const applyHoverZoom = useCallback((clientX, clientY) => {
    const host = hostRef.current
    const media = mediaRef.current
    if (!host || !media || lightboxOpen) {
      return
    }
    const rect = host.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    media.style.transformOrigin = originFromPointer(x, y, rect.width, rect.height)
    media.style.transform = `scale(${HOVER_ZOOM})`
  }, [lightboxOpen])

  const handlePointerEnter = (event) => {
    if (lightboxOpen) {
      return
    }
    setHovering(true)
    applyHoverZoom(event.clientX, event.clientY)
  }

  const handlePointerMove = (event) => {
    if (!hovering || lightboxOpen) {
      return
    }
    applyHoverZoom(event.clientX, event.clientY)
  }

  const handlePointerLeave = (event) => {
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
  }, [src, resetHoverZoom])

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
