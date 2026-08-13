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

const BASE_COLS = [
  { key: 'index', label: '#', width: 8, align: 'left' },
  { key: 'reference', label: 'Ref.', width: 28, align: 'left' },
  { key: 'description', label: 'Descripcion', width: 70, align: 'left' },
  { key: 'qty', label: 'Cant.', width: 14, align: 'right' },
  { key: 'unit', label: 'P. unit.', width: 28, align: 'right' },
  { key: 'subtotal', label: 'Subtotal', width: 28, align: 'right' },
]

const CART_COLS = [
  { key: 'index', label: '#', width: 8, align: 'left' },
  { key: 'cartId', label: 'id_carrito', width: 24, align: 'left' },
  { key: 'reference', label: 'Ref.', width: 24, align: 'left' },
  { key: 'description', label: 'Descripcion', width: 54, align: 'left' },
  { key: 'qty', label: 'Cant.', width: 12, align: 'right' },
  { key: 'unit', label: 'P. unit.', width: 26, align: 'right' },
  { key: 'subtotal', label: 'Subtotal', width: 28, align: 'right' },
]

function getColumns(includeCartId) {
  return includeCartId ? CART_COLS : BASE_COLS
}

function normalizeItems(items = [], { includeCartId = false } = {}) {
  return items.map((item, index) => {
    const quantity = Number(item.quantity) || 0
    const price = Number(item.price) || 0
    const row = {
      index: String(index + 1),
      reference: pdfTruncate(item.reference || item.id || '-', 18),
      description: pdfTruncate(
        [item.description, item.brand, item.model].filter(Boolean).join(' · ') || 'Producto',
        includeCartId ? 36 : 48,
      ),
      qty: String(quantity),
      unit: formatPrice(price),
      subtotal: formatPrice(price * quantity),
      quantity,
      price,
    }
    if (includeCartId) {
      row.cartId = pdfTruncate(item.cartId ?? item.id_carrito ?? '-', 14)
    }
    return row
  })
}

function drawTableHeader(doc, y, columns) {
  const { marginX } = getPdfPageMetrics(doc)
  const rowH = 8
  doc.setFillColor(...PDF_COLORS.accent)
  doc.rect(marginX, y, columns.reduce((sum, col) => sum + col.width, 0), rowH, 'F')
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

function drawItemRow(doc, row, y, alt, columns) {
  const { marginX } = getPdfPageMetrics(doc)
  const rowH = 7.2
  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0)

  if (alt) {
    doc.setFillColor(...PDF_COLORS.rowAlt)
    doc.rect(marginX, y, tableWidth, rowH, 'F')
  }

  doc.setDrawColor(...PDF_COLORS.line)
  doc.setLineWidth(0.15)
  doc.line(marginX, y + rowH, marginX + tableWidth, y + rowH)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_COLORS.ink)

  let x = marginX + 1.5
  columns.forEach((col) => {
    const value = row[col.key] ?? ''
    const textY = y + 4.8
    if (col.align === 'right') {
      doc.text(pdfText(value), x + col.width - 3, textY, { align: 'right' })
    } else {
      doc.text(pdfText(value), x, textY)
    }
    x += col.width
  })

  return y + rowH
}

function drawTotals(doc, y, { itemCount, units, total }) {
  const { marginX, contentWidth } = getPdfPageMetrics(doc)
  let cursor = y + 4
  doc.setDrawColor(...PDF_COLORS.line)
  doc.setLineWidth(0.4)
  doc.line(marginX, cursor, marginX + contentWidth, cursor)
  cursor += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(pdfText(`Productos: ${itemCount}`), marginX, cursor)
  doc.text(pdfText(`Unidades: ${units}`), marginX + 45, cursor)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...PDF_COLORS.ink)
  doc.text(pdfText('TOTAL'), marginX + contentWidth - 55, cursor)
  doc.text(pdfText(formatPrice(total)), marginX + contentWidth, cursor, { align: 'right' })
  return cursor + 6
}

/**
 * PDF estructurado para carrito o detalles de pedido.
 * @param {string} title
 * @param {Array} items
 * @param {number} total
 * @param {{ filename?: string, subtitle?: string, metaLines?: string[], includeCartId?: boolean }} [options]
 */
export function downloadOrderPdf(title, items = [], total = 0, options = {}) {
  const includeCartId = Boolean(options.includeCartId)
  const columns = getColumns(includeCartId)
  const rows = normalizeItems(items, { includeCartId })
  const computedTotal =
    Number(total) || rows.reduce((sum, row) => sum + row.price * row.quantity, 0)
  const units = rows.reduce((sum, row) => sum + row.quantity, 0)

  const doc = createPdfDocument()
  const startTable = () => drawTableHeader(doc, drawPdfBrandHeader(doc, {
    title,
    subtitle: options.subtitle,
    metaLines: options.metaLines,
  }) + 2, columns)

  let y = startTable()

  if (rows.length === 0) {
    y = ensurePdfSpace(doc, y, 10, startTable)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...PDF_COLORS.muted)
    const { marginX } = getPdfPageMetrics(doc)
    doc.text(pdfText('Sin productos para mostrar.'), marginX, y + 6)
    y += 14
  } else {
    rows.forEach((row, index) => {
      y = ensurePdfSpace(doc, y, 8, startTable)
      y = drawItemRow(doc, row, y, index % 2 === 1, columns)
    })
  }

  y = ensurePdfSpace(doc, y, 20, () => drawPdfBrandHeader(doc, {
    title,
    subtitle: options.subtitle,
    metaLines: options.metaLines,
  }) + 4)
  drawTotals(doc, y, { itemCount: rows.length, units, total: computedTotal })

  finalizePdfPages(doc)
  doc.save(options.filename || 'pedido-importadora.pdf')
}
