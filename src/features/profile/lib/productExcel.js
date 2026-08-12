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

async function loadXlsx() {
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

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function cellText(value) {
  if (value == null) return ''
  return String(value).trim()
}

/**
 * Solo columnas A/B, conservando el índice de fila del Excel (línea = index + 1).
 */
function toOrderColumnMatrix(matrix) {
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
 * Encabezados de la línea 1: reconoce "codigo" y "cantidad" aunque estén intercambiados.
 * Acepta "stock" como alias histórico de cantidad (plantilla anterior).
 * Devuelve los índices reales de cada columna para mapear el contenido correctamente.
 */
export function validateProductExcelHeaders(headers = []) {
  const cells = Array.isArray(headers) ? headers : []
  const colA = normalizeHeader(cells[0])
  const colB = normalizeHeader(cells[1])

  if (!colA && !colB) {
    return {
      valid: false,
      headers: [colA, colB],
      error: 'Faltan los encabezados en la línea 1: Codigo y cantidad',
    }
  }

  const isCodigo = (value) => value === 'codigo'
  const isCantidad = (value) => value === 'cantidad' || value === 'stock'

  let codigoIndex = -1
  let cantidadIndex = -1

  if (isCodigo(colA)) codigoIndex = 0
  if (isCodigo(colB)) codigoIndex = 1
  if (isCantidad(colA)) cantidadIndex = 0
  if (isCantidad(colB)) cantidadIndex = 1

  if (codigoIndex === -1 && cantidadIndex === -1) {
    return {
      valid: false,
      headers: [colA, colB],
      error: 'La línea 1 debe tener encabezados Codigo y cantidad',
    }
  }

  if (codigoIndex === -1) {
    return {
      valid: false,
      headers: [colA, colB],
      error: 'Falta el encabezado "Codigo" en la línea 1',
    }
  }

  if (cantidadIndex === -1) {
    return {
      valid: false,
      headers: [colA, colB],
      error: 'Falta el encabezado "cantidad" en la línea 1',
    }
  }

  if (codigoIndex === cantidadIndex) {
    return {
      valid: false,
      headers: [colA, colB],
      error: 'La línea 1 debe distinguir Codigo y cantidad en columnas distintas',
    }
  }

  return {
    valid: true,
    headers: ['codigo', 'cantidad'],
    codigoIndex,
    cantidadIndex,
    swapped: codigoIndex === 1 && cantidadIndex === 0,
  }
}

/**
 * Interpreta cantidad: número entero > 0.
 * Excel puede entregar number o string ("12", "12,5").
 */
function parseCantidadValue(rawCantidad) {
  if (typeof rawCantidad === 'number') {
    if (!Number.isFinite(rawCantidad)) {
      return { valid: false, reason: 'Cantidad inválida (no es un número)' }
    }
    if (rawCantidad <= 0) {
      return { valid: false, reason: 'Cantidad inválida (debe ser mayor a 0)' }
    }
    if (!Number.isInteger(rawCantidad)) {
      return { valid: false, reason: 'Cantidad inválida (debe ser un número entero)' }
    }
    return { valid: true, value: String(rawCantidad) }
  }

  const text = cellText(rawCantidad)
  if (!text) {
    return { valid: false, reason: 'Tiene código sin cantidad' }
  }

  const normalized = text.replace(/\s/g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return { valid: false, reason: 'Cantidad inválida (no es un número)' }
  }

  const cantidadNum = Number(normalized)
  if (!Number.isFinite(cantidadNum)) {
    return { valid: false, reason: 'Cantidad inválida (no es un número)' }
  }
  if (cantidadNum <= 0) {
    return { valid: false, reason: 'Cantidad inválida (debe ser mayor a 0)' }
  }
  if (!Number.isInteger(cantidadNum)) {
    return { valid: false, reason: 'Cantidad inválida (debe ser un número entero)' }
  }

  return { valid: true, value: String(cantidadNum) }
}

/**
 * Mapea filas 2…N a JSON de pedido: { codigo, cantidad }.
 * - Ambos campos obligatorios por fila válida
 * - Código duplicado → suma la cantidad al primer registro del código
 * - Código sin cantidad / cantidad sin código → se omite con motivo
 * - Filas totalmente vacías → se omiten en silencio
 * - Cantidad inválida → se omite con motivo
 */
export function mapExcelRowsToOrderJson(matrix, { codigoIndex = 0, cantidadIndex = 1 } = {}) {
  const items = []
  const omitted = []
  const merges = []
  const indexByCodigo = new Map()

  if (!Array.isArray(matrix) || matrix.length < 2) {
    return { items, omitted, merges }
  }

  const lastIndex = Math.min(matrix.length - 1, MAX_EXCEL_LINES - 1)

  for (let i = 1; i <= lastIndex; i += 1) {
    const excelLine = i + 1
    const row = Array.isArray(matrix[i]) ? matrix[i] : []
    const codigo = cellText(row[codigoIndex])
    const rawCantidad = row[cantidadIndex]
    const cantidadText = cellText(rawCantidad)

    const hasCodigo = codigo !== ''
    const hasCantidad = cantidadText !== '' || (typeof rawCantidad === 'number' && Number.isFinite(rawCantidad))

    if (!hasCodigo && !hasCantidad) {
      continue
    }

    if (hasCodigo && !hasCantidad) {
      omitted.push({ line: excelLine, reason: 'Tiene código sin cantidad' })
      continue
    }

    if (!hasCodigo && hasCantidad) {
      omitted.push({ line: excelLine, reason: 'Tiene cantidad sin código' })
      continue
    }

    const cantidadParsed = parseCantidadValue(rawCantidad)
    if (!cantidadParsed.valid) {
      omitted.push({ line: excelLine, reason: cantidadParsed.reason })
      continue
    }

    const existingIndex = indexByCodigo.get(codigo)
    if (existingIndex != null) {
      const previous = items[existingIndex]
      const mergedQty = Number(previous.cantidad) + Number(cantidadParsed.value)
      items[existingIndex] = {
        ...previous,
        cantidad: String(mergedQty),
      }
      merges.push({
        line: excelLine,
        codigo,
        added: cantidadParsed.value,
        total: String(mergedQty),
        reason: `Código duplicado: se sumó ${cantidadParsed.value} (total ${mergedQty})`,
      })
      continue
    }

    indexByCodigo.set(codigo, items.length)
    items.push({
      codigo,
      cantidad: cantidadParsed.value,
    })
  }

  return { items, omitted, merges }
}

export function formatOmittedLinesMessage(omitted = []) {
  if (!Array.isArray(omitted) || omitted.length === 0) {
    return ''
  }

  const preview = omitted
    .slice(0, 8)
    .map((entry) => `Línea ${entry.line}: ${entry.reason}`)
    .join(' · ')

  const extra = omitted.length > 8 ? ` · y ${omitted.length - 8} más` : ''
  return `Se omitieron ${omitted.length} línea(s). ${preview}${extra}`
}

export function rowsToSheetMatrix(items = []) {
  return [
    EXCEL_HEADERS,
    ...items.map((row) => [
      row.codigo ?? row.Codigo ?? '',
      row.cantidad ?? row.stock ?? 0,
    ]),
  ]
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

/**
 * Carga Excel de pedido con validaciones:
 * 1) solo .xlsx / .xls
 * 2) tope de líneas (MAX_EXCEL_LINES)
 * 3) encabezados A/B en línea 1
 * 4) filas con ambos campos; incompletas/invalidas se omiten con motivo
 * 5) al menos 1 producto válido
 */
export async function parseAndValidateProductExcelFile(file) {
  const typeCheck = validateExcelFileType(file)
  if (!typeCheck.valid) {
    return typeCheck
  }

  let XLSX
  try {
    XLSX = await loadXlsx()
  } catch {
    return { valid: false, error: 'No se pudo cargar el lector de Excel. Intente de nuevo.' }
  }

  let workbook
  try {
    const buffer = await file.arrayBuffer()
    workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  } catch {
    return {
      valid: false,
      error: 'No se pudo leer el archivo. Verifique que sea un Excel válido (.xlsx o .xls)',
    }
  }

  const sheetName = workbook.SheetNames?.[0]
  if (!sheetName) {
    return { valid: false, error: 'El archivo no contiene hojas' }
  }

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    return { valid: false, error: 'No se pudo abrir la primera hoja del Excel' }
  }

  let rawMatrix
  try {
    rawMatrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true })
  } catch {
    return { valid: false, error: 'No se pudo interpretar el contenido del Excel' }
  }

  if (!Array.isArray(rawMatrix) || rawMatrix.length === 0) {
    return { valid: false, error: 'El archivo está vacío' }
  }

  const orderMatrix = toOrderColumnMatrix(rawMatrix)
  const lineCount = countExcelLines(orderMatrix)

  if (lineCount <= 1) {
    return {
      valid: false,
      error: 'El archivo solo tiene encabezados. Agregue productos desde la línea 2',
      lineCount,
    }
  }

  if (lineCount > MAX_EXCEL_LINES) {
    return {
      valid: false,
      error: `El tope son ${MAX_EXCEL_LINES} líneas por archivo Excel (incluye encabezados)`,
      lineCount,
    }
  }

  if (orderMatrix.length > MAX_EXCEL_LINES) {
    return {
      valid: false,
      error: `El archivo supera ${MAX_EXCEL_LINES} líneas. Reduzca el contenido e intente de nuevo`,
      lineCount: orderMatrix.length,
    }
  }

  const headerCheck = validateProductExcelHeaders(orderMatrix[0] || [])
  if (!headerCheck.valid) {
    return headerCheck
  }

  const { items, omitted, merges } = mapExcelRowsToOrderJson(orderMatrix, {
    codigoIndex: headerCheck.codigoIndex,
    cantidadIndex: headerCheck.cantidadIndex,
  })

  if (items.length === 0) {
    const omittedHint = omitted.length > 0
      ? ` ${formatOmittedLinesMessage(omitted)}`
      : ''
    return {
      valid: false,
      error: `No hay productos válidos (se requieren código y cantidad en cada fila).${omittedHint}`,
      omitted,
      merges,
      lineCount,
    }
  }

  if (items.length < MIN_PRODUCT_CODES) {
    return {
      valid: false,
      error: `El archivo debe tener al menos ${MIN_PRODUCT_CODES} líneas de código válidas (tiene ${items.length})`,
      omitted,
      merges,
      lineCount,
      items,
    }
  }

  return {
    valid: true,
    lineCount,
    headers: headerCheck.headers,
    swapped: Boolean(headerCheck.swapped),
    items,
    rows: items,
    omitted,
    merges,
    warning: omitted.length > 0 ? formatOmittedLinesMessage(omitted) : '',
    matrix: rowsToSheetMatrix(items),
    processLog: buildConversionProcessLog({
      items,
      omitted,
      merges,
      swapped: Boolean(headerCheck.swapped),
    }),
  }
}

/**
 * Mensajes OK (200) breves de la conversión Excel → JSON.
 */
export function buildConversionProcessLog({
  items = [],
  omitted = [],
  merges = [],
  swapped = false,
} = {}) {
  const log = [
    { code: 200, message: 'Excel validado' },
    { code: 200, message: 'Encabezados OK' },
  ]

  if (swapped) {
    log.push({ code: 200, message: 'Columnas corregidas' })
  }

  if (merges.length > 0) {
    log.push({
      code: 200,
      message: `${merges.length} código(s) duplicado(s) consolidados`,
    })
  }

  log.push({
    code: 200,
    message: `${items.length} producto(s) en JSON`,
  })

  if (omitted.length > 0) {
    log.push({
      code: 200,
      message: `${omitted.length} línea(s) con error`,
    })
  }

  log.push({ code: 200, message: 'Listo para procesar' })

  return log
}
