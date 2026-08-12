const LEAFLET_CSS_ID = 'leaflet-css-cdn'
const LEAFLET_JS_ID = 'leaflet-js-cdn'
const LEAFLET_VERSION = '1.9.4'

let leafletPromise = null

function ensureCss() {
  if (document.getElementById(LEAFLET_CSS_ID)) return
  const link = document.createElement('link')
  link.id = LEAFLET_CSS_ID
  link.rel = 'stylesheet'
  link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`
  document.head.appendChild(link)
}

/**
 * Carga diferida de Leaflet desde CDN (sin API key).
 * Solo se ejecuta al abrir el mapa en Finalizar.
 */
export function loadLeaflet() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Leaflet solo está disponible en el navegador'))
  }

  if (window.L) {
    return Promise.resolve(window.L)
  }

  if (leafletPromise) {
    return leafletPromise
  }

  ensureCss()

  leafletPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(LEAFLET_JS_ID)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L), { once: true })
      existing.addEventListener('error', () => {
        leafletPromise = null
        reject(new Error('No se pudo cargar Leaflet'))
      }, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = LEAFLET_JS_ID
    script.async = true
    script.defer = true
    script.src = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`
    script.onload = () => {
      if (!window.L) {
        leafletPromise = null
        reject(new Error('Leaflet no inicializó correctamente'))
        return
      }
      resolve(window.L)
    }
    script.onerror = () => {
      leafletPromise = null
      reject(new Error('No se pudo cargar Leaflet'))
    }
    document.head.appendChild(script)
  })

  return leafletPromise
}
