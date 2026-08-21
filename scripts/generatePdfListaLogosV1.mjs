/**
 * Genera pdfListaLogosV1.pdf de muestra con el formato actual del listado.
 * Uso: node scripts/generatePdfListaLogosV1.mjs
 *
 * TEMPORALMENTE COMENTADO — no ejecutar hasta reactivar.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { jsPDF } = require('jspdf')

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'pdfListaLogosV1.pdf')
const BRAND_ICON_PATH = join(ROOT, 'dist', 'assets', 'icon-BYLBN25J.ico')
const BRAND_ICON_FALLBACK = join(ROOT, 'src', 'assets', 'logos', 'icon.ico')

const LOGO_URLS = [
  join(ROOT, 'public/listado-precios/marcas/10656650_marcas-09.png'),
  join(ROOT, 'public/listado-precios/marcas/57432582_marcas-06.png'),
  join(ROOT, 'public/listado-precios/marcas/15060940_marcas-10.png'),
  join(ROOT, 'public/listado-precios/marcas/22885058_marcas-12.png'),
  join(ROOT, 'public/listado-precios/marcas/99540505_marcas-18.png'),
  join(ROOT, 'public/listado-precios/marcas/motopj-01.png'),
  join(ROOT, 'public/listado-precios/marcas/63519402_marcas-03.png'),
  join(ROOT, 'public/listado-precios/marcas/37749159_marcas-64.png'),
]

const SAMPLE_FILTERS = {
  brand: 'AKT, Yamaha',
  category: 'Repuestos, Lubricantes',
  model: 'FX150, Gen',
}

const SAMPLE_ROWS = [
  ['REF-001', 'Repuestos Filtro aceite FX150', 'AKT', '$ 45.000'],
  ['REF-002', 'Lubricantes 4T 20W50 Gen', 'Yamaha', '$ 32.500'],
  ['REF-003', 'Accesorios Casco integral M', 'Bajaj', '$ 189.900'],
  ['REF-004', 'Repuestos Kit cadena CRF', 'Honda', '$ 78.000'],
  ['REF-005', 'Repuestos Pastillas freno Hunk', 'Hero', '$ 28.400'],
]

const STICKER_H = 11 * 1.25
const STICKER_MAX_W = 16 * 1.25
const STICKER_GAP = 2.2
const BRAND_ICON_SIZE = 12

async function ensureSharp() {
  try {
    return (await import('sharp')).default
  } catch {
    const { execSync } = await import('node:child_process')
    execSync('npm install sharp --no-save', { stdio: 'inherit', cwd: ROOT })
    return (await import('sharp')).default
  }
}

async function bufferToPngImage(buffer, sharp) {
  const raw = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  let png = raw
  // ICO moderno suele embeber PNG; sharp no lee .ico nativo.
  if (raw[0] === 0x00 && raw[1] === 0x00 && raw[2] === 0x01 && raw[3] === 0x00) {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    let best = null
    let from = 0
    while (from < raw.length) {
      const idx = raw.indexOf(sig, from)
      if (idx < 0) break
      const iend = raw.indexOf(Buffer.from('IEND'), idx)
      if (iend < 0) break
      const chunk = raw.subarray(idx, iend + 8)
      if (!best || chunk.length > best.length) best = chunk
      from = idx + 1
    }
    if (!best) {
      throw new Error('ICO sin PNG embebido')
    }
    png = best
  } else if (!(raw[0] === 0x89 && raw[1] === 0x50)) {
    png = await sharp(raw).png().toBuffer()
  }
  const meta = await sharp(png).metadata()
  return {
    dataUrl: `data:image/png;base64,${png.toString('base64')}`,
    width: meta.width || 100,
    height: meta.height || 100,
  }
}

async function loadLogoPngDataUrl(urlOrPath, sharp) {
  if (typeof urlOrPath === 'string' && (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://'))) {
    const response = await fetch(urlOrPath)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${urlOrPath}`)
    }
    return bufferToPngImage(Buffer.from(await response.arrayBuffer()), sharp)
  }
  return bufferToPngImage(readFileSync(urlOrPath), sharp)
}

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

async function main() {
  const sharp = await ensureSharp()
  const logos = []
  for (const url of LOGO_URLS) {
    logos.push(await loadLogoPngDataUrl(url, sharp))
  }

  let brandIcon = null
  try {
    const iconPath = require('node:fs').existsSync(BRAND_ICON_PATH)
      ? BRAND_ICON_PATH
      : BRAND_ICON_FALLBACK
    brandIcon = await bufferToPngImage(readFileSync(iconPath), sharp)
  } catch (error) {
    console.warn('No se pudo cargar icono de marca:', error.message)
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const PX_TO_MM = 25.4 / 96
  const PT_TO_MM = 25.4 / 72
  const TITLE_GAP_MM = 3 * PX_TO_MM
  const marginX = Math.max(6, 14 - (35 * PX_TO_MM) / 2)
  const contentWidth = pageWidth - marginX * 2
  const headerH = 36

  // Polaridad invertida: fondo claro / texto oscuro
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, headerH, 'F')
  doc.setDrawColor(206, 212, 218)
  doc.setLineWidth(0.35)
  doc.line(0, headerH, pageWidth, headerH)

  let textX = marginX
  if (brandIcon) {
    const { w, h } = fitImage(brandIcon, BRAND_ICON_SIZE, BRAND_ICON_SIZE)
    doc.addImage(brandIcon.dataUrl, 'PNG', marginX, (headerH - h) / 2, w, h)
    textX = marginX + w + 4
  }

  doc.setTextColor(52, 58, 64)
  const titleSizes = [14, 9]
  const titleBlockH = titleSizes.reduce((sum, size, index) => (
    sum + size * PT_TO_MM + (index < titleSizes.length - 1 ? TITLE_GAP_MM : 0)
  ), 0)
  let textY = (headerH - titleBlockH) / 2 + titleSizes[0] * PT_TO_MM * 0.8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Importadora Premium', textX, textY)
  textY += titleSizes[0] * PT_TO_MM + TITLE_GAP_MM
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Listado de precios', textX, textY)

  const sizes = logos.map((image) => ({
    ...fitImage(image, STICKER_MAX_W, STICKER_H),
    image,
  }))
  const rowWidth = sizes.reduce((sum, e, i) => sum + e.w + (i > 0 ? STICKER_GAP : 0), 0)
  let x = Math.max(marginX, pageWidth - marginX - rowWidth)
  const mid = headerH / 2
  sizes.forEach(({ w, h, image }) => {
    doc.addImage(image.dataUrl, 'PNG', x, mid - h / 2, w, h)
    x += w + STICKER_GAP
  })

  let y = headerH + 8

  const filterParts = [
    SAMPLE_FILTERS.brand ? `Marca: ${SAMPLE_FILTERS.brand}` : null,
    SAMPLE_FILTERS.category ? `Categoria: ${SAMPLE_FILTERS.category}` : null,
    SAMPLE_FILTERS.model ? `Modelo: ${SAMPLE_FILTERS.model}` : null,
  ].filter(Boolean)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(33, 37, 41)
  doc.text('Filtros aplicados', marginX, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(108, 117, 125)
  doc.text(filterParts.length > 0 ? filterParts.join('   ') : 'Sin filtros (catalogo disponible)', marginX, y)
  y += 8
  doc.setDrawColor(206, 212, 218)
  doc.line(marginX, y, marginX + contentWidth, y)
  y += 6

  const colDefs = [
    { label: 'Codigo', weight: 42 },
    { label: 'Producto', weight: 130 },
    { label: 'Marca', weight: 54 },
    { label: 'Precio', weight: 34, align: 'right' },
  ]
  const totalWeight = colDefs.reduce((s, c) => s + c.weight, 0)
  const cols = colDefs.map((col) => ({ ...col, w: (col.weight / totalWeight) * contentWidth }))
  const tableW = contentWidth
  doc.setFillColor(73, 80, 87)
  doc.rect(marginX, y, tableW, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  let cx = marginX + 1.5
  cols.forEach((col) => {
    if (col.align === 'right') {
      doc.text(col.label, cx + col.w - 3, y + 5.2, { align: 'right' })
    } else {
      doc.text(col.label, cx, y + 5.2)
    }
    cx += col.w
  })
  y += 8

  SAMPLE_ROWS.forEach((row, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(248, 249, 250)
      doc.rect(marginX, y, tableW, 7, 'F')
    }
    doc.setDrawColor(206, 212, 218)
    doc.line(marginX, y + 7, marginX + tableW, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(33, 37, 41)
    cx = marginX + 1.5
    row.forEach((value, i) => {
      const col = cols[i]
      if (col.align === 'right') {
        doc.text(String(value), cx + col.w - 3, y + 4.6, { align: 'right' })
      } else {
        doc.text(String(value), cx, y + 4.6)
      }
      cx += col.w
    })
    y += 7
  })

  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setDrawColor(206, 212, 218)
  doc.line(marginX, pageHeight - 12, marginX + contentWidth, pageHeight - 12)
  doc.setFontSize(8)
  doc.setTextColor(108, 117, 125)
  doc.text('Importadora Premium', marginX, pageHeight - 7)
  doc.text(`Cantidad de registros: ${SAMPLE_ROWS.length}`, marginX + contentWidth / 2, pageHeight - 7, { align: 'center' })
  doc.text('Pagina 1 de 1', marginX + contentWidth, pageHeight - 7, { align: 'right' })

  writeFileSync(OUT, Buffer.from(doc.output('arraybuffer')))
  writeFileSync(join(ROOT, 'listado-precios.pdf'), Buffer.from(doc.output('arraybuffer')))
  console.log(`OK → ${OUT}`)
  console.log(`OK → ${join(ROOT, 'listado-precios.pdf')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
