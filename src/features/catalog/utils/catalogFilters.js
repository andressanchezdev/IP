/**
 * Utilidades de filtro catálogo / listado de precios.
 * Estado interno: IDs de GET /api/v1/general/filter.
 * Productos en UI: campos texto (marca, categoria, modelo).
 */

export const DEFAULT_FILTER_MODES = {
  brands: 'all',
  categories: 'all',
  models: 'all',
}

export const EMPTY_FILTER_IDS = {
  brands: [],
  categories: [],
  models: [],
}

/** @param {{ id: string, label: string }[]} items */
export function buildFilterLabelLookup(items = []) {
  const lookup = new Map()
  items.forEach((entry) => {
    if (entry?.id != null && entry?.label) {
      lookup.set(String(entry.id), String(entry.label))
    }
  })
  return lookup
}

/** Resuelve IDs seleccionados a labels para comparar con productos. */
export function resolveSelectedLabels(selectedIds = [], lookup = new Map()) {
  return selectedIds
    .map((id) => lookup.get(String(id)))
    .filter(Boolean)
}

function normalizeText(value) {
  return String(value ?? '').trim().toLocaleLowerCase('es')
}

/** Compara producto contra labels seleccionados (insensible a mayúsculas). */
export function productMatchesLabels(productValue, selectedLabels = []) {
  if (!selectedLabels.length) {
    return true
  }
  const normalized = normalizeText(productValue)
  return selectedLabels.some((label) => normalizeText(label) === normalized)
}

/**
 * Body POST /api/v1/inventory/products/list
 * @param {{ brands?: string[], categories?: string[], models?: string[], modes?: Record<string, string> }} params
 */
export function buildProductsListBody({
  brands = [],
  categories = [],
  models = [],
  modes = DEFAULT_FILTER_MODES,
} = {}) {
  const toNumericIds = (values = []) => values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))

  const body = {
    marcas: [],
    categorias: [],
    modelos: [],
  }

  if (modes.brands === 'custom' && brands.length > 0) {
    body.marcas = toNumericIds(brands).map((id) => ({ id_marca: id }))
  }
  if (modes.categories === 'custom' && categories.length > 0) {
    body.categorias = toNumericIds(categories).map((id) => ({ id_categoria: id }))
  }
  if (modes.models === 'custom' && models.length > 0) {
    body.modelos = toNumericIds(models).map((id) => ({ id_modelo: id }))
  }

  return body
}

/**
 * Body POST /api/v1/inventory/products/filter
 * Arrays vacíos = sin filtro en ese campo.
 * `cantidad` = checkbox "Con cantidad" (true | false).
 */
export function buildProductsFilterBody({
  brands = [],
  categories = [],
  models = [],
  modes = DEFAULT_FILTER_MODES,
  withStock = false,
} = {}) {
  return {
    ...buildProductsListBody({ brands, categories, models, modes }),
    cantidad: Boolean(withStock),
  }
}

export function isFilterSelectionBlocked(modes = DEFAULT_FILTER_MODES) {
  return modes.brands === 'none'
    || modes.categories === 'none'
    || modes.models === 'none'
}
