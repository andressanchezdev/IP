import { formatPrice } from '@/shared/lib/formatPrice'
import { resolvePriceListHeaderLogoUrls } from '@/shared/lib/brandLogos'
import companyIconUrl from '@/assets/logos/icon.ico'
import {
  PDF_COLORS,
  createPdfDocument,
  drawPdfBrandHeader,
  ensurePdfSpace,
  finalizePdfPages,
  getPdfPageMetrics,
} from '@/shared/lib/pdf/pdfDocument'
import { loadPdfImageFromSrc, loadPdfImagesFromUrls } from '@/shared/lib/pdf/pdfImages'
import { pdfText, pdfTruncate } from '@/shared/lib/pdf/pdfText'

/** Mismo criterio de ancho que pdfListaLogosV1 (margin con +35px). */
const PX_TO_MM = 25.4 / 96
export const PRICE_LIST_MARGIN_X = Math.max(6, 14 - (35 * PX_TO_MM) / 2)

const COL_DEFS = [
  { key: 'reference', label: 'Codigo', weight: 42, align: 'left' },
  { key: 'catalogDetail', label: 'Producto', weight: 130, align: 'left' },
  { key: 'brand', label: 'Marca', weight: 54, align: 'left' },
  { key: 'price', label: 'Precio', weight: 34, align: 'right' },
]

function toUpperDisplay(value) {
  return String(value ?? '').trim().toLocaleUpperCase('es')
}

function getPriceListColumns(contentWidth) {
  const totalWeight = COL_DEFS.reduce((sum, col) => sum + col.weight, 0)
  return COL_DEFS.map((col) => ({
    ...col,
    width: (col.weight / totalWeight) * contentWidth,
  }))
}

function getPriceListMetrics(doc) {
  return getPdfPageMetrics(doc, { marginX: PRICE_LIST_MARGIN_X })
}

function normalizeProducts(products = []) {
  return products.map((product) => ({
    reference: pdfTruncate(toUpperDisplay(product.reference || product.id || '—'), 16),
    catalogDetail: pdfTruncate(
      [
        toUpperDisplay(product.category || '—'),
        toUpperDisplay(product.description || '—'),
        toUpperDisplay(product.model || '—'),
      ].join(' '),
      90,
    ),
    brand: pdfTruncate(toUpperDisplay(product.brand || '—'), 16),
    price: formatPrice(Number(product.price) || 0),
  }))
}

function drawFilters(doc, y, filters = {}) {
  const { marginX, contentWidth } = getPriceListMetrics(doc)
  const parts = [
    filters.brand ? `Marca: ${toUpperDisplay(filters.brand)}` : null,
    filters.category ? `Categoria: ${toUpperDisplay(filters.category)}` : null,
    filters.model ? `Modelo: ${toUpperDisplay(filters.model)}` : null,
  ].filter(Boolean)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...PDF_COLORS.ink)
  doc.text(pdfText('Filtros aplicados'), marginX, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_COLORS.muted)
  const filterLine = parts.length > 0
    ? parts.join('   ')
    : 'Sin filtros (catalogo disponible)'
  doc.text(pdfText(filterLine), marginX, y + 5)

  doc.setDrawColor(...PDF_COLORS.line)
  doc.line(marginX, y + 8, marginX + contentWidth, y + 8)
  return y + 12
}

function drawTableHeader(doc, y, columns) {
  const { marginX, contentWidth } = getPriceListMetrics(doc)
  const rowH = 8
  doc.setFillColor(...PDF_COLORS.accent)
  doc.rect(marginX, y, contentWidth, rowH, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_COLORS.headerFg)

  let x = marginX + 1.5
  columns.forEach((col) => {
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

function drawProductRow(doc, row, y, alt, columns) {
  const { marginX, contentWidth } = getPriceListMetrics(doc)
  const rowH = 7

  if (alt) {
    doc.setFillColor(...PDF_COLORS.rowAlt)
    doc.rect(marginX, y, contentWidth, rowH, 'F')
  }

  doc.setDrawColor(...PDF_COLORS.line)
  doc.setLineWidth(0.15)
  doc.line(marginX, y + rowH, marginX + contentWidth, y + rowH)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...PDF_COLORS.ink)

  let x = marginX + 1.5
  columns.forEach((col) => {
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
 * PDF listado-precios.
 *
 * @param {{
 *   products?: Array,
 *   filters?: { brand?: string, category?: string, model?: string },
 *   brandOptions?: Array<{ id: string, label: string, image?: string }>,
 *   selectedBrandIds?: Array<string|number>,
 *   brandMode?: 'all'|'none'|'custom',
 *   filename?: string,
 * }} [options]
 */
export async function downloadPriceListPdf(options = {}) {
  const products = Array.isArray(options.products) ? options.products : []
  const filters = options.filters || {}

  const rows = normalizeProducts(products)
  const doc = await createPdfDocument({ orientation: 'landscape' })
  const { contentWidth } = getPriceListMetrics(doc)
  const columns = getPriceListColumns(contentWidth)

  const headerLogoUrls = resolvePriceListHeaderLogoUrls({
    brandOptions: options.brandOptions,
    selectedBrandIds: options.selectedBrandIds,
    brandMode: options.brandMode,
  })

  const [logoImages, brandIcon] = await Promise.all([
    loadPdfImagesFromUrls(headerLogoUrls),
    loadPdfImageFromSrc(companyIconUrl),
  ])

  const startBody = () => {
    let y = drawPdfBrandHeader(doc, {
      title: 'Listado de precios',
      logoImages,
      brandIcon,
      invertColors: true,
      showGeneratedAt: false,
      marginX: PRICE_LIST_MARGIN_X,
    })
    y = drawFilters(doc, y, filters)
    return drawTableHeader(doc, y, columns)
  }

  let y = startBody()

  if (rows.length === 0) {
    const { marginX } = getPriceListMetrics(doc)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...PDF_COLORS.muted)
    doc.text(pdfText('No hay productos para el listado con los filtros actuales.'), marginX, y + 8)
  } else {
    rows.forEach((row, index) => {
      y = ensurePdfSpace(doc, y, 8, startBody, { marginX: PRICE_LIST_MARGIN_X })
      y = drawProductRow(doc, row, y, index % 2 === 1, columns)
    })
  }

  finalizePdfPages(doc, {
    marginX: PRICE_LIST_MARGIN_X,
    footerCenter: `Cantidad de registros: ${rows.length}`,
  })
  doc.save(options.filename || 'listado-precios.pdf')
}
