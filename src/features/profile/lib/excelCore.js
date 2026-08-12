/** Encabezados oficiales (columna A = codigo, B = cantidad). */
export const EXCEL_HEADERS = ['Codigo', 'cantidad']
export const EXCEL_TEMPLATE_FILENAME = 'formatoexel.xlsx'
/** Línea 1 = header; líneas 2–251 = productos (máx. 251 filas en total). */
export const MAX_EXCEL_LINES = 251
/** Mínimo de códigos/productos válidos para enviar el pedido al carrito. */
export const MIN_PRODUCT_CODES = 5

const EXCEL_EXTENSIONS = ['.xlsx', '.xls']
const EXCEL_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
  '',
])
const EXCEL_SHEET_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** SheetJS solo se descarga la primera vez que Subida masiva lee/genera un .xlsx. */
let xlsxModulePromise = null

export async function loadXlsx() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx').then((mod) => mod.default ?? mod)
  }
  return xlsxModulePromise
}

/** Plantilla oficial en memoria (sin archivo en el repo). */
function getOfficialTemplateMatrix() {
  return [EXCEL_HEADERS]
}

/**
 * Genera el .xlsx oficial con SheetJS a partir de la matriz de plantilla.
 */
async function buildOfficialExcelTemplateBlob() {
  const XLSX = await loadXlsx()
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(getOfficialTemplateMatrix())
  XLSX.utils.book_append_sheet(workbook, sheet, 'Plantilla')
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([buffer], { type: EXCEL_SHEET_MIME })
}

export function cellText(value) {
  if (value == null) return ''
  return String(value).trim()
}

/**
 * Solo columnas A/B, conservando el índice de fila del Excel (línea = index + 1).
 */
export function toOrderColumnMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return [EXCEL_HEADERS]
  }

  return matrix.map((row) => {
    const cells = Array.isArray(row) ? row : []
    return [cells[0] ?? '', cells[1] ?? '']
  })
}

/**
 * Matriz visible de plantilla: recorta vacías al final y limita a A/B.
 */
function trimSheetMatrix(matrix) {
  const columns = toOrderColumnMatrix(matrix)
  const header = columns[0] || EXCEL_HEADERS

  let lastUsed = 0
  columns.forEach((row, index) => {
    if (cellText(row[0]) || cellText(row[1])) {
      lastUsed = index
    }
  })

  const rows = columns.slice(0, lastUsed + 1)
  return rows.length ? rows : [header]
}

/**
 * Cuenta líneas usadas (header + filas con al menos un dato en codigo/cantidad).
 */
export function countExcelLines(matrix = []) {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return 0
  }

  let count = 0
  matrix.forEach((row, index) => {
    const cells = Array.isArray(row) ? row : []
    const hasContent = cellText(cells[0]) || cellText(cells[1])
    if (index === 0 || hasContent) {
      count += 1
    }
  })
  return count
}

/**
 * Valida extensión y MIME: únicamente Excel (.xlsx / .xls).
 */
export function validateExcelFileType(file) {
  if (!file) {
    return { valid: false, error: 'Seleccione un archivo Excel (.xlsx o .xls)' }
  }

  const name = String(file.name || '').toLowerCase()
  const hasExcelExtension = EXCEL_EXTENSIONS.some((ext) => name.endsWith(ext))
  if (!hasExcelExtension) {
    return {
      valid: false,
      error: 'Solo se permiten archivos Excel (.xlsx o .xls)',
    }
  }

  const mime = String(file.type || '').toLowerCase()
  if (mime && !EXCEL_MIME_TYPES.has(mime) && !mime.includes('excel') && !mime.includes('spreadsheet')) {
    return {
      valid: false,
      error: 'El archivo no parece ser un Excel válido (.xlsx o .xls)',
    }
  }

  return { valid: true }
}

/**
 * Devuelve la matriz visible de la plantilla oficial (generada en memoria).
 */
export async function loadTemplateSheetMatrix() {
  return trimSheetMatrix(getOfficialTemplateMatrix())
}

/** Genera y descarga `formatoexel.xlsx` sin mantener el archivo en el repo. */
export async function downloadOfficialExcelTemplate() {
  let blob
  try {
    blob = await buildOfficialExcelTemplateBlob()
  } catch {
    throw new Error('No se pudo generar la plantilla')
  }

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = EXCEL_TEMPLATE_FILENAME
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
