async function loadXlsx() {
  const mod = await import('xlsx')
  return mod.default ?? mod
}

function normalizeRows(products = []) {
  return products.map((product) => ({
    Codigo: product.reference || product.id || '',
    'Categoria/Descripcion/Modelo': [
      product.category || '',
      product.description || '',
      product.model || '',
    ].join(' / '),
    Marca: product.brand || '',
    Precio: Number(product.price) || 0,
  }))
}

/**
 * Descarga listado de precios en formato Excel (.xlsx).
 * @param {{ products?: Array, filename?: string }} [options]
 */
export async function downloadPriceListExcel(options = {}) {
  const products = Array.isArray(options.products) ? options.products : []
  const rows = normalizeRows(products)
  const XLSX = await loadXlsx()
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, sheet, 'Listado')
  XLSX.writeFile(workbook, options.filename || 'listado-precios.xlsx')
}
