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

/** jsPDF se carga bajo demanda para no inflar el bundle inicial. */
export async function createPdfDocument({ orientation = 'portrait' } = {}) {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  })
}

export function getPdfPageMetrics(doc, { marginX: marginOverride } = {}) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = Number.isFinite(marginOverride) ? marginOverride : 14
  const contentWidth = pageWidth - marginX * 2
  return { pageWidth, pageHeight, marginX, contentWidth, bottomLimit: pageHeight - 18 }
}

const PX_TO_MM = 25.4 / 96
const PT_TO_MM = 25.4 / 72
/** Separación vertical entre líneas del bloque de título del encabezado. */
const HEADER_TITLE_GAP_MM = 3 * PX_TO_MM


/** Stickers de marca: base 11×16 mm + 25%. */
const HEADER_STICKER_H = 11 * 1.25
const HEADER_STICKER_MAX_W = 16 * 1.25
const HEADER_STICKER_GAP = 2.2
const BRAND_ICON_SIZE = 12

function fitImage(image, maxW, maxH) {
  const ratio = image.width > 0 ? image.height / image.width : 1
  let w = maxW
  let h = w * ratio
  if (h > maxH) {
    h = maxH
    w = h / (ratio || 1)
  }
  return { w, h }
}

function drawHeaderBrandIcon(doc, brandIcon, marginX, headerH) {
  if (!brandIcon?.dataUrl) {
    return marginX
  }

  const { w, h } = fitImage(brandIcon, BRAND_ICON_SIZE, BRAND_ICON_SIZE)
  const x = marginX
  const y = (headerH - h) / 2
  try {
    doc.addImage(brandIcon.dataUrl, 'PNG', x, y, w, h)
  } catch {
    return marginX
  }
  return x + w + 4
}

function drawHeaderLogoStickers(doc, logoImages = [], headerH, marginX) {
  if (!Array.isArray(logoImages) || logoImages.length === 0) {
    return
  }

  const { pageWidth } = getPdfPageMetrics(doc, { marginX })
  const sizes = logoImages.map((image) => ({
    ...fitImage(image, HEADER_STICKER_MAX_W, HEADER_STICKER_H),
    image,
  }))

  const rowWidth = sizes.reduce((sum, entry, index) => (
    sum + entry.w + (index > 0 ? HEADER_STICKER_GAP : 0)
  ), 0)

  let x = Math.max(marginX, pageWidth - marginX - rowWidth)
  const bandMid = headerH / 2

  sizes.forEach(({ w, h, image }) => {
    try {
      doc.addImage(image.dataUrl, 'PNG', x, bandMid - h / 2, w, h)
    } catch {
      // Si una imagen falla, el resto del encabezado sigue.
    }
    x += w + HEADER_STICKER_GAP
  })
}

/**
 * Encabezado de marca + título de documento. Devuelve Y siguiente.
 * @param {object} options
 * @param {boolean} [options.invertColors] — intercambia fondo/texto del encabezado
 * @param {boolean} [options.showGeneratedAt=true] — línea "Generado: …"
 * @param {string} [options.headerMeta] — meta dentro del encabezado (ej. Registros)
 * @param {object} [options.brandIcon] — logo empresa esquina izquierda
 * @param {Array} [options.logoImages] — stickers de marcas
 * @param {number} [options.marginX] — margen horizontal opcional
 */
export function drawPdfBrandHeader(doc, {
  title,
  subtitle,
  metaLines = [],
  logoImages = [],
  brandIcon = null,
  invertColors = false,
  showGeneratedAt = true,
  headerMeta = '',
  marginX: marginOverride,
} = {}) {
  const { marginX, contentWidth, pageWidth } = getPdfPageMetrics(doc, { marginX: marginOverride })
  const hasStickers = Array.isArray(logoImages) && logoImages.length > 0
  const headerH = hasStickers || brandIcon ? 36 : 28

  const bg = invertColors ? PDF_COLORS.headerFg : PDF_COLORS.headerBg
  const fg = invertColors ? PDF_COLORS.headerBg : PDF_COLORS.headerFg

  doc.setFillColor(...bg)
  doc.rect(0, 0, pageWidth, headerH, 'F')

  if (invertColors) {
    doc.setDrawColor(...PDF_COLORS.line)
    doc.setLineWidth(0.35)
    doc.line(0, headerH, pageWidth, headerH)
  }

  const textX = drawHeaderBrandIcon(doc, brandIcon, marginX, headerH)

  const titleSizes = [14, 9]
  if (subtitle) {
    titleSizes.push(9)
  }
  if (headerMeta) {
    titleSizes.push(9)
  }

  const titleBlockH = titleSizes.reduce((sum, size, index) => (
    sum + size * PT_TO_MM + (index < titleSizes.length - 1 ? HEADER_TITLE_GAP_MM : 0)
  ), 0)
  // Centrado vertical entre top y bottom del encabezado (no horizontal).
  let textY = (headerH - titleBlockH) / 2 + titleSizes[0] * PT_TO_MM * 0.8
  let sizeIndex = 0

  doc.setTextColor(...fg)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(pdfText('Importadora Premium'), textX, textY)
  sizeIndex += 1
  textY += titleSizes[sizeIndex - 1] * PT_TO_MM + HEADER_TITLE_GAP_MM

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(pdfText(title || 'Documento'), textX, textY)
  sizeIndex += 1
  if (sizeIndex < titleSizes.length) {
    textY += titleSizes[sizeIndex - 1] * PT_TO_MM + HEADER_TITLE_GAP_MM
  }

  if (subtitle) {
    doc.text(pdfText(subtitle), textX, textY)
    sizeIndex += 1
    if (sizeIndex < titleSizes.length) {
      textY += titleSizes[sizeIndex - 1] * PT_TO_MM + HEADER_TITLE_GAP_MM
    }
  }

  if (headerMeta) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(pdfText(headerMeta), textX, textY)
  }

  drawHeaderLogoStickers(doc, logoImages, headerH, marginX)

  let y = headerH + 8

  if (showGeneratedAt) {
    doc.setTextColor(...PDF_COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(pdfText(`Generado: ${formatPdfDate()}`), marginX, y)
    y += 4
  }

  const bodyMeta = metaLines.filter(Boolean)
  if (bodyMeta.length > 0) {
    doc.setTextColor(...PDF_COLORS.muted)
    doc.setFontSize(8)
    bodyMeta.forEach((line, index) => {
      doc.text(pdfText(line), marginX + contentWidth / 2, y + index * 4, { align: 'left' })
    })
    y += bodyMeta.length * 4
  }

  if (showGeneratedAt || bodyMeta.length > 0) {
    y += 2
    doc.setDrawColor(...PDF_COLORS.line)
    doc.setLineWidth(0.3)
    doc.line(marginX, y, marginX + contentWidth, y)
    return y + 6
  }

  return y
}

export function drawPdfFooter(doc, pageNumber, pageCount, {
  marginX: marginOverride,
  footerCenter = '',
} = {}) {
  const { marginX, contentWidth, pageHeight } = getPdfPageMetrics(doc, { marginX: marginOverride })
  const y = pageHeight - 7
  doc.setDrawColor(...PDF_COLORS.line)
  doc.line(marginX, pageHeight - 12, marginX + contentWidth, pageHeight - 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_COLORS.muted)
  doc.text(pdfText('Importadora Premium'), marginX, y)
  if (footerCenter) {
    doc.text(pdfText(footerCenter), marginX + contentWidth / 2, y, { align: 'center' })
  }
  doc.text(pdfText(`Pagina ${pageNumber} de ${pageCount}`), marginX + contentWidth, y, {
    align: 'right',
  })
}

export function finalizePdfPages(doc, { marginX, footerCenter = '' } = {}) {
  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    drawPdfFooter(doc, page, pageCount, { marginX, footerCenter })
  }
}

export function ensurePdfSpace(doc, y, needed, onNewPage, { marginX } = {}) {
  const { bottomLimit } = getPdfPageMetrics(doc, { marginX })
  if (y + needed <= bottomLimit) {
    return y
  }
  doc.addPage()
  return onNewPage()
}
