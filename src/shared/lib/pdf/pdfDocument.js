import { jsPDF } from 'jspdf'
import { formatPdfDate, pdfText } from './pdfText'

export const PDF_COLORS = {
  ink: [33, 37, 41],
  muted: [108, 117, 125],
  line: [206, 212, 218],
  headerBg: [52, 58, 64],
  headerFg: [255, 255, 255],
  rowAlt: [248, 249, 250],
  accent: [73, 80, 87],
}

export function createPdfDocument({ orientation = 'portrait' } = {}) {
  return new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  })
}

export function getPdfPageMetrics(doc) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 14
  const contentWidth = pageWidth - marginX * 2
  return { pageWidth, pageHeight, marginX, contentWidth, bottomLimit: pageHeight - 18 }
}

/** Encabezado de marca + título de documento. Devuelve Y siguiente. */
export function drawPdfBrandHeader(doc, { title, subtitle, metaLines = [] }) {
  const { marginX, contentWidth, pageWidth } = getPdfPageMetrics(doc)
  let y = 16

  doc.setFillColor(...PDF_COLORS.headerBg)
  doc.rect(0, 0, pageWidth, 28, 'F')

  doc.setTextColor(...PDF_COLORS.headerFg)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(pdfText('Importadora Premium'), marginX, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(pdfText(title || 'Documento'), marginX, 20)

  if (subtitle) {
    doc.text(pdfText(subtitle), marginX, 25)
  }

  y = 36
  doc.setTextColor(...PDF_COLORS.muted)
  doc.setFontSize(8)
  doc.text(pdfText(`Generado: ${formatPdfDate()}`), marginX, y)

  metaLines.filter(Boolean).forEach((line, index) => {
    doc.text(pdfText(line), marginX + contentWidth / 2, y + index * 4, { align: 'left' })
  })

  y += Math.max(6, metaLines.length * 4 + 2)
  doc.setDrawColor(...PDF_COLORS.line)
  doc.setLineWidth(0.3)
  doc.line(marginX, y, marginX + contentWidth, y)
  return y + 6
}

export function drawPdfFooter(doc, pageNumber, pageCount) {
  const { marginX, contentWidth, pageHeight } = getPdfPageMetrics(doc)
  doc.setDrawColor(...PDF_COLORS.line)
  doc.line(marginX, pageHeight - 12, marginX + contentWidth, pageHeight - 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(pdfText('Importadora Premium'), marginX, pageHeight - 7)
  doc.text(pdfText(`Pagina ${pageNumber} de ${pageCount}`), marginX + contentWidth, pageHeight - 7, {
    align: 'right',
  })
}

export function finalizePdfPages(doc) {
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    drawPdfFooter(doc, page, pageCount)
  }
}

export function ensurePdfSpace(doc, y, needed, onNewPage) {
  const { bottomLimit } = getPdfPageMetrics(doc)
  if (y + needed <= bottomLimit) {
    return y
  }
  doc.addPage()
  return onNewPage()
}
