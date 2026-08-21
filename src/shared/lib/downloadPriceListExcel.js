async function loadXlsx() {
  const mod = await import('xlsx')
  return mod.default ?? mod
}

function toUpperDisplay(value) {
  return String(value ?? '').trim().toLocaleUpperCase('es')
}

function catalogDetail(product) {
  return [
    toUpperDisplay(product.category || '—'),
    toUpperDisplay(product.description || '—'),
    toUpperDisplay(product.model || '—'),
  ].join(' ')
}

function buildFilterLine(filters = {}) {
  const parts = [
    filters.brand ? `Marca: ${toUpperDisplay(filters.brand)}` : null,
    filters.category ? `Categoria: ${toUpperDisplay(filters.category)}` : null,
    filters.model ? `Modelo: ${toUpperDisplay(filters.model)}` : null,
  ].filter(Boolean)

  return parts.length > 0
    ? parts.join('   ')
    : 'Sin filtros (catalogo disponible)'
}

/**
 * Excel alineado al PDF: encabezado, filtros y
 * Codigo | Producto | Marca | Precio (textos en mayúsculas).
 *
 * @param {{ products?: Array, filters?: { brand?: string, category?: string, model?: string }, filename?: string }} [options]
 */
export async function downloadPriceListExcel(options = {}) {
  const products = Array.isArray(options.products) ? options.products : []
  const filters = options.filters || {}
  const XLSX = await loadXlsx()

  const headerRows = [
    ['Importadora Premium'],
    ['Listado de precios'],
    [`Cantidad de registros: ${products.length}`],
    [],
    ['Filtros aplicados'],
    [buildFilterLine(filters)],
    [],
    ['Codigo', 'Producto', 'Marca', 'Precio'],
  ]

  const dataRows = products.map((product) => [
    toUpperDisplay(product.reference || product.id || ''),
    catalogDetail(product),
    toUpperDisplay(product.brand || ''),
    Number(product.price) || 0,
  ])

  const sheet = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows])
  sheet['!cols'] = [
    { wch: 16 },
    { wch: 56 },
    { wch: 18 },
    { wch: 14 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Listado')
  XLSX.writeFile(workbook, options.filename || 'listado-precios.xlsx')
}
