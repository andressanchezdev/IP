import {
  MAX_EXCEL_LINES,
  MIN_PRODUCT_CODES,
  countExcelLines,
  loadXlsx,
  toOrderColumnMatrix,
  validateExcelFileType,
} from './excelCore'
import {
  buildConversionProcessLog,
  formatOmittedLinesMessage,
  mapExcelRowsToOrderJson,
  rowsToSheetMatrix,
  validateProductExcelHeaders,
} from './excelOrderMapping'

export {
  EXCEL_HEADERS,
  EXCEL_TEMPLATE_FILENAME,
  MAX_EXCEL_LINES,
  MIN_PRODUCT_CODES,
  countExcelLines,
  downloadOfficialExcelTemplate,
  loadTemplateSheetMatrix,
  validateExcelFileType,
} from './excelCore'
export {
  buildConversionProcessLog,
  formatOmittedLinesMessage,
  mapExcelRowsToOrderJson,
  rowsToSheetMatrix,
  validateProductExcelHeaders,
} from './excelOrderMapping'

/**
 * Carga Excel de pedido con validaciones:
 * 1) solo .xlsx / .xls
 * 2) tope de líneas (MAX_EXCEL_LINES)
 * 3) encabezados A/B en línea 1
 * 4) filas con ambos campos; incompletas/invalidas se omiten con motivo
 * 5) al menos MIN_PRODUCT_CODES productos válidos
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
