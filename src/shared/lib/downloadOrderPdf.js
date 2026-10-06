import { formatPrice } from '@/shared/lib/formatPrice'
import { summarizeCartItems, getIvaBreakdownLabel } from '@/shared/lib/money'
import {
  PDF_COLORS,
  createPdfDocument,
  drawPdfBrandHeader,
  ensurePdfSpace,
  finalizePdfPages,
  getPdfPageMetrics,
} from '@/shared/lib/pdf/pdfDocument'
import { pdfText, pdfTruncate } from '@/shared/lib/pdf/pdfText'
import { buildProductDetailSegments, buildProductDetailText } from '@/shared/lib/productText'
import { toUpperText } from '@/shared/lib/upperText'

/** La descripción se parte en líneas (no se trunca) hasta este máximo. */
const MAX_DESC_LINES = 3
const DESC_LINE_H = 3.4
const MIN_ROW_H = 7.2

const BASE_COLS = [
  { key: 'index', label: '#', width: 8, align: 'left' },
  { key: 'reference', label: 'Ref.', width: 28, align: 'left' },
  { key: 'description', label: 'Descripcion', width: 72, align: 'left' },
  { key: 'qty', label: 'Cant.', width: 14, align: 'right' },
  { key: 'unit', label: 'P. unit.', width: 28, align: 'right' },
  { key: 'subtotal', label: 'Total', width: 28, align: 'right' },
]

const CART_COLS = [
  { key: 'index', label: '#', width: 8, align: 'left' },
  { key: 'cartId', label: 'id_carrito', width: 20, align: 'left' },
  { key: 'reference', label: 'Ref.', width: 24, align: 'left' },
  { key: 'description', label: 'Descripcion', width: 62, align: 'left' },
  { key: 'qty', label: 'Cant.', width: 12, align: 'right' },
  { key: 'unit', label: 'P. unit.', width: 26, align: 'right' },
  { key: 'subtotal', label: 'Total', width: 28, align: 'right' },
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
      reference: pdfTruncate(toUpperText(item.reference || item.id || '-'), 18),
      // descripcion · categoria · marca · modelo (misma regla que todos los archivos generados)
      description: buildProductDetailText(item, { upper: true }),
      detailSegments: buildProductDetailSegments(item).map((segment) => ({
        ...segment,
        value: segment.value.toLocaleUpperCase('es'),
      })),
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

/**
 * Parte "descripcion · categoria · marca · modelo" en líneas.
 * Si no cabe en MAX_DESC_LINES se acorta solo la descripción: categoría, marca y modelo
 * siempre se conservan.
 */
function wrapProductDetail(doc, row, width) {
  const wrap = (text) => doc.splitTextToSize(pdfText(text), width)
  const join = (segments) => segments.map((segment) => segment.value).join(' \u00B7 ')
  const segments = row.detailSegments?.length
    ? row.detailSegments
    : [{ key: 'fallback', value: row.description }]

  let lines = wrap(join(segments))
  if (lines.length <= MAX_DESC_LINES) return lines

  const [head, ...tail] = segments
  if (head.key === 'description' && tail.length > 0) {
    let shortened = head.value
    while (shortened.length > 3) {
      shortened = shortened.slice(0, -1).trimEnd()
      lines = wrap(join([{ ...head, value: `${shortened}...` }, ...tail]))
      if (lines.length <= MAX_DESC_LINES) return lines
    }
  }

  lines = wrap(join(segments)).slice(0, MAX_DESC_LINES)
  lines[MAX_DESC_LINES - 1] = `${lines[MAX_DESC_LINES - 1].slice(0, -3).trimEnd()}...`
  return lines
}

/** Calcula las líneas de la descripción según el ancho de su columna y la altura de fila. */
function layoutItemRow(doc, row, columns) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const descriptionCol = columns.find((col) => col.key === 'description')
  const lines = wrapProductDetail(doc, row, descriptionCol.width - 3)
  const rowH = Math.max(MIN_ROW_H, 3.4 + lines.length * DESC_LINE_H)
  return { ...row, descriptionLines: lines, rowH }
}

function drawItemRow(doc, row, y, alt, columns) {
  const { marginX } = getPdfPageMetrics(doc)
  const rowH = row.rowH ?? MIN_ROW_H
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
    const textY = y + 4.8
    if (col.key === 'description' && Array.isArray(row.descriptionLines)) {
      row.descriptionLines.forEach((line, lineIndex) => {
        doc.text(pdfText(line), x, textY + lineIndex * DESC_LINE_H)
      })
    } else if (col.align === 'right') {
      doc.text(pdfText(row[col.key] ?? ''), x + col.width - 3, textY, { align: 'right' })
    } else {
      doc.text(pdfText(row[col.key] ?? ''), x, textY)
    }
    x += col.width
  })

  return y + rowH
}

function drawTotals(doc, y, { itemCount, units, total, subtotal, iva, ivaLabel = 'IVA' }) {
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

  const amountX = marginX + contentWidth
  const labelX = amountX - 55

  if (subtotal != null && iva != null) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...PDF_COLORS.ink)
    doc.text(pdfText('Subtotal'), labelX, cursor)
    doc.text(pdfText(formatPrice(subtotal)), amountX, cursor, { align: 'right' })
    cursor += 6
    doc.text(pdfText(ivaLabel), labelX, cursor)
    doc.text(pdfText(formatPrice(iva)), amountX, cursor, { align: 'right' })
    cursor += 7
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...PDF_COLORS.ink)
  doc.text(pdfText('TOTAL'), labelX, cursor)
  doc.text(pdfText(formatPrice(total)), amountX, cursor, { align: 'right' })
  return cursor + 6
}

/**
 * PDF estructurado para carrito o detalles de pedido.
 * @param {string} title
 * @param {Array} items
 * @param {number} total
 * @param {{ filename?: string, subtitle?: string, metaLines?: string[], includeCartId?: boolean }} [options]
 */
export async function downloadOrderPdf(title, items = [], total = 0, options = {}) {
  const includeCartId = Boolean(options.includeCartId)
  const columns = getColumns(includeCartId)
  const rows = normalizeItems(items, { includeCartId })
  const breakdown = options.totals || summarizeCartItems(items)
  const computedTotal = Number(total) || breakdown.total
  const units = rows.reduce((sum, row) => sum + row.quantity, 0)

  const doc = await createPdfDocument()
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
      const laidOut = layoutItemRow(doc, row, columns)
      y = ensurePdfSpace(doc, y, laidOut.rowH + 1, startTable)
      y = drawItemRow(doc, laidOut, y, index % 2 === 1, columns)
    })
  }

  y = ensurePdfSpace(doc, y, 36, () => drawPdfBrandHeader(doc, {
    title,
    subtitle: options.subtitle,
    metaLines: options.metaLines,
  }) + 4)
  drawTotals(doc, y, {
    itemCount: rows.length,
    units,
    total: computedTotal,
    subtotal: breakdown.subtotal,
    iva: breakdown.iva,
    ivaLabel: options.ivaLabel || getIvaBreakdownLabel(items),
  })

  finalizePdfPages(doc)
  doc.save(options.filename || 'pedido-importadora.pdf')
}
