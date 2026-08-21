import { resolveAssetUrl } from '@/features/catalog/mappers/resolveAssetUrl'

const GCS_MARCAS =
  'https://storage.googleapis.com/importadorapremiumonline/dependencias/img/marcas'

/** Fallback local solo si el API no trae `imagen`. */
const LOCAL_PDF_MARCAS = '/listado-precios/marcas'

/** Marcas por defecto en encabezado PDF cuando no hay filtro de marca (máx. 8). */
export const DEFAULT_PRICE_LIST_HEADER_BRANDS = [
  'AKT',
  'YAMAHA',
  'BAJAJ',
  'HONDA',
  'HERO',
  'PREMIUMGENUINE',
  'KYMCO',
  'ADVANCE',
]

const LOCAL_BRAND_LOGO_FILES = {
  akt: `${LOCAL_PDF_MARCAS}/10656650_marcas-09.png`,
  yamaha: `${LOCAL_PDF_MARCAS}/57432582_marcas-06.png`,
  bajaj: `${LOCAL_PDF_MARCAS}/15060940_marcas-10.png`,
  honda: `${LOCAL_PDF_MARCAS}/22885058_marcas-12.png`,
  hero: `${LOCAL_PDF_MARCAS}/99540505_marcas-18.png`,
  premiumgenuine: `${LOCAL_PDF_MARCAS}/motopj-01.png`,
  'premium genuine': `${LOCAL_PDF_MARCAS}/motopj-01.png`,
  motopj: `${LOCAL_PDF_MARCAS}/motopj-01.png`,
  kymco: `${LOCAL_PDF_MARCAS}/63519402_marcas-03.png`,
  advance: `${LOCAL_PDF_MARCAS}/37749159_marcas-64.png`,
}

const BRAND_LOGO_URLS = {
  bajaj: `${GCS_MARCAS}/15060940_marcas-10.png`,
  akt: `${GCS_MARCAS}/10656650_marcas-09.png`,
  honda: `${GCS_MARCAS}/22885058_marcas-12.png`,
  yamalube: `${GCS_MARCAS}/42501267_marcas-61.png`,
  mobil: `${GCS_MARCAS}/48568160_marcas-63.png`,
  yamaha: `${GCS_MARCAS}/57432582_marcas-06.png`,
  kixx: `${GCS_MARCAS}/68311880_aceites-06.png`,
  motul: `${GCS_MARCAS}/96259009_marcas-41.png`,
  hero: `${GCS_MARCAS}/99540505_marcas-18.png`,
  premiumgenuine: `${GCS_MARCAS}/DISE%C3%91O%20DE%20MARCAS%20DE%20MOTOPJ-01.webp`,
  kymco: `${GCS_MARCAS}/63519402_marcas-03.png`,
  advance: `${GCS_MARCAS}/37749159_marcas-64.png`,
}

export const DEFAULT_BRAND_LOGO_URL = `${GCS_MARCAS}/IMPORTADOOoK-72-72.png`

function normalizeBrandKey(brand) {
  return String(brand || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+original$/i, '')
    .replace(/\s+/g, ' ')
}

export function getBrandLogoUrl(brand) {
  if (!brand) {
    return DEFAULT_BRAND_LOGO_URL
  }

  const key = normalizeBrandKey(brand)
  return LOCAL_BRAND_LOGO_FILES[key]
    ?? BRAND_LOGO_URLS[key]
    ?? DEFAULT_BRAND_LOGO_URL
}

/**
 * URL de logo para una marca del GET /general/filter.
 * Prioridad: `imagen` del API → fallback local/GCS por nombre.
 */
export function resolveBrandLogoFromFilterOption(entry) {
  if (!entry) {
    return DEFAULT_BRAND_LOGO_URL
  }

  const fromApi = resolveAssetUrl(entry.image || '')
  if (fromApi) {
    return fromApi
  }

  return getBrandLogoUrl(entry.label)
}

/**
 * Resuelve URLs de stickers del encabezado PDF según filtro de marcas
 * (GET /api/v1/general/filter → marcas[].imagen).
 * - Sin filtro de marca → hasta 8 marcas por defecto (con imagen del API si existe).
 * - Con marcas seleccionadas → 1..8 logos de esas marcas usando `imagen` del API.
 *
 * @param {{
 *   brandOptions?: Array<{ id: string, label: string, image?: string }>,
 *   selectedBrandIds?: Array<string|number>,
 *   brandMode?: 'all'|'none'|'custom',
 * }} [options]
 * @returns {string[]}
 */
export function resolvePriceListHeaderLogoUrls({
  brandOptions = [],
  selectedBrandIds = [],
  brandMode = 'all',
} = {}) {
  const options = Array.isArray(brandOptions) ? brandOptions : []
  const byId = new Map(options.map((entry) => [String(entry.id), entry]))
  const byLabel = new Map(
    options.map((entry) => [normalizeBrandKey(entry.label), entry]),
  )

  const hasCustomBrands = brandMode === 'custom'
    && Array.isArray(selectedBrandIds)
    && selectedBrandIds.length > 0

  let picked = []
  if (hasCustomBrands) {
    picked = selectedBrandIds
      .map((id) => byId.get(String(id)))
      .filter(Boolean)
  } else {
    picked = DEFAULT_PRICE_LIST_HEADER_BRANDS
      .map((name) => byLabel.get(normalizeBrandKey(name)) || { id: name, label: name })
  }

  if (picked.length === 0) {
    picked = DEFAULT_PRICE_LIST_HEADER_BRANDS.map((name) => ({ id: name, label: name }))
  }

  const urls = picked
    .slice(0, 8)
    .map((entry) => resolveBrandLogoFromFilterOption(entry))
    .filter(Boolean)

  return urls.length > 0 ? urls : [getBrandLogoUrl('akt')]
}

/** @deprecated Usar resolvePriceListHeaderLogoUrls */
export const PRICE_LIST_HEADER_LOGO_URLS = DEFAULT_PRICE_LIST_HEADER_BRANDS
  .map((name) => getBrandLogoUrl(name))
  .filter(Boolean)
