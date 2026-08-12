import { EXCEL_HEADERS, MAX_EXCEL_LINES, cellText } from './excelCore'

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
