import { useEffect, useRef, useState } from 'react'
import { loadLeaflet } from '@/shared/maps/loadLeaflet'
import { namedControl } from '@/shared/lib/namedControl'

const BOGOTA = { lat: 4.711, lng: -74.0721 }

async function reverseGeocode(lat, lng) {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lng))
    url.searchParams.set('zoom', '18')

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    }
    const data = await response.json()
    return data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

/**
 * Mapa gratuito (Leaflet + OpenStreetMap + Nominatim).
 * Sin API key. Se carga solo al montar el slot en Finalizar.
 */
export function CheckoutDeliveryMap({ onLocationChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onLocationChangeRef = useRef(onLocationChange)
  onLocationChangeRef.current = onLocationChange

  const [mapState, setMapState] = useState({
    status: 'loading',
    message: 'Cargando mapa…',
  })

  useEffect(() => {
    let cancelled = false
    let map = null

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return

        map = L.map(containerRef.current, {
          center: [BOGOTA.lat, BOGOTA.lng],
          zoom: 13,
        })

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map)

        mapRef.current = map

        requestAnimationFrame(() => map.invalidateSize())
        window.setTimeout(() => map.invalidateSize(), 200)

        const applyPosition = async (lat, lng) => {
          if (!markerRef.current) {
            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
            markerRef.current.on('dragend', async () => {
              const pos = markerRef.current.getLatLng()
              setMapState({ status: 'ready', message: 'Obteniendo dirección…' })
              const address = await reverseGeocode(pos.lat, pos.lng)
              if (cancelled) return
              onLocationChangeRef.current?.({ lat: pos.lat, lng: pos.lng, address })
              setMapState({ status: 'ready', message: 'Ubicación lista para confirmar' })
            })
          } else {
            markerRef.current.setLatLng([lat, lng])
          }

          setMapState({ status: 'ready', message: 'Obteniendo dirección…' })
          const address = await reverseGeocode(lat, lng)
          if (cancelled) return
          onLocationChangeRef.current?.({ lat, lng, address })
          setMapState({ status: 'ready', message: 'Ubicación lista para confirmar' })
        }

        map.on('click', (event) => {
          applyPosition(event.latlng.lat, event.latlng.lng)
        })

        setMapState({ status: 'ready', message: 'Toque el mapa para marcar la entrega' })
      })
      .catch((error) => {
        if (!cancelled) {
          setMapState({
            status: 'error',
            message: error?.message || 'No se pudo cargar el mapa',
          })
        }
      })

    return () => {
      cancelled = true
      if (map) {
        map.remove()
      }
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  return (
    <div className="checkout-finalize__map-slot" role="application" {...namedControl('Mapa de entrega')}>
      <div ref={containerRef} className="checkout-finalize__map-canvas" />
      <p
        className={
          mapState.status === 'error'
            ? 'checkout-finalize__map-status'
            : 'checkout-finalize__map-hint'
        }
        role="status"
      >
        {mapState.message}
      </p>
    </div>
  )
}
