import { formatPrice } from '@/shared/lib/formatPrice'
import {
  PDF_COLORS,
  createPdfDocument,
  drawPdfBrandHeader,
  ensurePdfSpace,
  finalizePdfPages,
  getPdfPageMetrics,
} from '@/shared/lib/pdf/pdfDocument'
import { pdfText, pdfTruncate } from '@/shared/lib/pdf/pdfText'

const COLS = [
  { key: 'reference', label: 'Codigo', width: 42, align: 'left' },
  { key: 'catalogDetail', label: 'Categoria / Descripcion / Modelo', width: 130, align: 'left' },
  { key: 'brand', label: 'Marca', width: 54, align: 'left' },
  { key: 'price', label: 'Precio', width: 34, align: 'right' },
]

function normalizeProducts(products = []) {
  return products.map((product) => ({
    reference: pdfTruncate(product.reference || product.id || '—', 16),
    catalogDetail: pdfTruncate(
      [
        product.category || '—',
        product.description || '—',
        product.model || '—',
      ].join(' / '),
      74,
    ),
    brand: pdfTruncate(product.brand || '—', 16),
    price: formatPrice(Number(product.price) || 0),
  }))
}

function drawFilters(doc, y, filters = {}) {
  const { marginX, contentWidth } = getPdfPageMetrics(doc)
  const parts = [
    filters.brand ? `Marca: ${filters.brand}` : null,
    filters.category ? `Categoria: ${filters.category}` : null,
    filters.model ? `Modelo: ${filters.model}` : null,
  ].filter(Boolean)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...PDF_COLORS.ink)
  doc.text(pdfText('Filtros aplicados'), marginX, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_COLORS.muted)
  const filterLine = parts.length > 0 ? parts.join('  |  ') : 'Sin filtros (catalogo disponible)'
  doc.text(pdfText(filterLine), marginX, y + 5)

  doc.setDrawColor(...PDF_COLORS.line)
  doc.line(marginX, y + 8, marginX + contentWidth, y + 8)
  return y + 12
}

function drawTableHeader(doc, y) {
  const { marginX } = getPdfPageMetrics(doc)
  const rowH = 8
  const tableWidth = COLS.reduce((sum, col) => sum + col.width, 0)
  doc.setFillColor(...PDF_COLORS.accent)
  doc.rect(marginX, y, tableWidth, rowH, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_COLORS.headerFg)

  let x = marginX + 1.5
  COLS.forEach((col) => {
    const textY = y + 5.2
    if (col.align === 'right') {
      doc.text(pdfText(col.label), x + col.width - 3, textY, { align: 'right' })
    } else {
      doc.text(pdfText(col.label), x, textY)
    }
    x += col.width
  })
  return y + rowH
}

function drawProductRow(doc, row, y, alt) {
  const { marginX } = getPdfPageMetrics(doc)
  const rowH = 7
  const tableWidth = COLS.reduce((sum, col) => sum + col.width, 0)

  if (alt) {
    doc.setFillColor(...PDF_COLORS.rowAlt)
    doc.rect(marginX, y, tableWidth, rowH, 'F')
  }

  doc.setDrawColor(...PDF_COLORS.line)
  doc.setLineWidth(0.15)
  doc.line(marginX, y + rowH, marginX + tableWidth, y + rowH)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...PDF_COLORS.ink)

  let x = marginX + 1.5
  COLS.forEach((col) => {
    const value = row[col.key] ?? ''
    const textY = y + 4.6
    if (col.align === 'right') {
      doc.text(pdfText(value), x + col.width - 3, textY, { align: 'right' })
    } else {
      doc.text(pdfText(value), x, textY)
    }
    x += col.width
  })
  return y + rowH
}

/**
 * Estructura inicial del PDF de listado de precios.
 * @param {{ products?: Array, filters?: { brand?: string, category?: string, model?: string }, filename?: string }} [options]
 */
export function downloadPriceListPdf(options = {}) {
  // Los productos ya llegan filtrados (POST /inventory/products/list).
  // `filters` es solo texto informativo del encabezado.
  const products = Array.isArray(options.products) ? options.products : []
  const filters = options.filters || {}

  const rows = normalizeProducts(products)
  const doc = createPdfDocument({ orientation: 'landscape' })

  const startBody = () => {
    let y = drawPdfBrandHeader(doc, {
      title: 'Listado de precios',
      subtitle: 'Estructura inicial de descarga PDF',
      metaLines: [`Registros: ${rows.length}`],
    })
    y = drawFilters(doc, y, filters)
    return drawTableHeader(doc, y)
  }

  let y = startBody()

  if (rows.length === 0) {
    const { marginX } = getPdfPageMetrics(doc)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(pdfText('No hay productos para el listado con los filtros actuales.'), marginX, y + 8)
  } else {
    rows.forEach((row, index) => {
      y = ensurePdfSpace(doc, y, 8, startBody)
      y = drawProductRow(doc, row, y, index % 2 === 1)
    })
  }

  finalizePdfPages(doc)
  doc.save(options.filename || 'listado-precios.pdf')
}
