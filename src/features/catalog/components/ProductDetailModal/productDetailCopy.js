/** Sellos estáticos del detalle de producto (`public/static/landing/sellos`). */
export const PRODUCT_SELLOS = [
  { src: '/static/landing/sellos/Sello-calidad.png', label: 'Sello de calidad' },
  { src: '/static/landing/sellos/confianzasello.png', label: 'Sello de confianza' },
  { src: '/static/landing/sellos/economiasello.png', label: 'Sello de economía' },
]

/**
 * Tres versiones del mismo mensaje institucional (detalle de producto).
 * En UI se muestra solo una por apertura.
 */
export const PRODUCT_LOREM_VERSIONS = [
  'En Importadora Premium tenemos una variedad de productos y repuestos del mercado, Trabajamos con la mejor calidad de piezas del mercado con el  mejor precio para nuestros clientes, repuestos para que tu taller o negocio avance sin detenerse. Conoce todo nuestro catálogo y encuentra lo que necesitas en un solo lugar.',
  'En Importadora Premium encontrarás un amplio surtido de repuestos para moto y todas las marcas mas vendidas de el mercado, con piezas de calidad comprobada y precios competitivos. Cada referencia está pensada para responder a la demanda real del mercado y a la confianza de quienes nos eligen día a día. Explora nuestro catálogo completo y elige con seguridad.',
  'Importadora Premium reúnimos los repuestos que el mercado exige, con calidad y precio que respaldan cada pedido. proporcionando confiza sobre todos nuestros productos y repuestos, confianza Desde el mostrador hasta el despacho, buscamos que encuentres lo que buscas de forma clara, rápida y confiable. llevamos la calidad a ti  Importadora Premium.',
]

/** Elige una sola versión (estable por `seed`, p. ej. id de producto). */
export function pickProductLoremVersion(seed = '') {
  const list = PRODUCT_LOREM_VERSIONS
  if (list.length === 0) {
    return ''
  }
  const text = String(seed)
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash + text.charCodeAt(i) * (i + 1)) % list.length
  }
  return list[hash] ?? list[0]
}
