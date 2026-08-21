/**
 * Flow de Historial (cards): label "actual" vs "exitoso" según progreso.
 * API `estado` es string (ej. "verificacion"), no array.
 */
export const ORDER_STEP_DEFS = [
  { key: 'verificacion', currentLabel: 'Verificación', doneLabel: 'Verificación exitosa' },
  { key: 'picking', currentLabel: 'Picking', doneLabel: 'Picking exitoso' },
  { key: 'packing', currentLabel: 'Packing', doneLabel: 'Packing exitoso' },
  { key: 'facturacion', currentLabel: 'Facturación', doneLabel: 'Facturación exitosa' },
  { key: 'despacho', currentLabel: 'Despacho', doneLabel: 'Despacho' },
  { key: 'enviado', currentLabel: 'Enviado', doneLabel: 'Enviado' },
]

/** @deprecated Prefer ORDER_STEP_DEFS; se mantiene por longitud / compat. */
export const ORDER_STEPS = ORDER_STEP_DEFS.map((step) => step.doneLabel)

const API_ESTADO_TO_INDEX = {
  verificacion: 0,
  'verificacion exitosa': 0,
  picking: 1,
  'picking exitoso': 1,
  packing: 2,
  'packing exitoso': 2,
  facturacion: 3,
  'facturacion exitosa': 3,
  factura: 3,
  despacho: 4,
  enviado: 5,
  envio: 5,
}

const WS_TIPO_TO_INDEX = {
  tomapedido: 0,
  'toma pedido': 0,
  picking: 1,
  'picking cambio corroborar': 1,
  packing: 2,
  venta: 3,
  despacho: 4,
  traslado: 5,
}

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function resolveStepIndexFromKey(key) {
  if (!key) {
    return 0
  }

  if (API_ESTADO_TO_INDEX[key] != null) {
    return API_ESTADO_TO_INDEX[key]
  }

  const asciiMap = Object.fromEntries(
    Object.entries(API_ESTADO_TO_INDEX).map(([k, v]) => [normalizeKey(k), v]),
  )
  if (asciiMap[key] != null) {
    return asciiMap[key]
  }

  if (key.includes('verif')) return 0
  if (key.includes('pick')) return 1
  if (key.includes('pack')) return 2
  if (key.includes('fact')) return 3
  if (key.includes('desp')) return 4
  if (key.includes('envi') || key.includes('traslad')) return 5

  return 0
}

/** Índice 0..n a partir de `estado` API o label. */
export function getOrderStepIndex(statusOrEstado) {
  const asText = String(statusOrEstado ?? '').trim()
  if (!asText) {
    return 0
  }

  const byDone = ORDER_STEP_DEFS.findIndex((step) => step.doneLabel === asText)
  if (byDone >= 0) {
    return byDone
  }

  const byCurrent = ORDER_STEP_DEFS.findIndex((step) => step.currentLabel === asText)
  if (byCurrent >= 0) {
    return byCurrent
  }

  return resolveStepIndexFromKey(normalizeKey(asText))
}

export function resolveOrderStepFromEstado(estado) {
  const index = getOrderStepIndex(estado)
  return ORDER_STEP_DEFS[index]?.currentLabel ?? ORDER_STEP_DEFS[0].currentLabel
}

export function resolveOrderStepFromWsTipo(tipo) {
  const key = normalizeKey(tipo)
  if (WS_TIPO_TO_INDEX[key] != null) {
    return ORDER_STEP_DEFS[WS_TIPO_TO_INDEX[key]].currentLabel
  }
  return resolveOrderStepFromEstado(tipo)
}

/**
 * Label visible en el flow:
 * - pasos ya pasados → "... exitoso/a"
 * - paso actual y pendientes → nombre corto (ej. "Verificación")
 */
export function getFlowStepLabel(stepIndex, currentStepIndex) {
  const def = ORDER_STEP_DEFS[stepIndex] ?? ORDER_STEP_DEFS[0]
  if (stepIndex < currentStepIndex) {
    return def.doneLabel
  }
  return def.currentLabel
}

export function getCurrentFlowLabel(statusOrEstado) {
  const index = getOrderStepIndex(statusOrEstado)
  return getFlowStepLabel(index, index)
}

export function mapEstadoFacturaLabel(estadoFactura) {
  const value = Number(estadoFactura)
  if (value === 1) {
    return 'OK'
  }
  if (value === 0) {
    return 'Anulada'
  }
  return '—'
}

/**
 * Tone CSS para badge de Cartera según `estado` API.
 * bg / text: disponible, ocupada, pausa, picking, packing, …
 */
export function resolveEstadoBadgeTone(estado) {
  const key = normalizeKey(estado)

  if (!key) {
    return 'default'
  }
  if (key.includes('facturacion') && key.includes('disponible')) {
    return 'facturacion-disponible'
  }
  if (key.includes('facturacion') && key.includes('ocupada')) {
    return 'facturacion-ocupada'
  }
  if (key.includes('facturacion') && key.includes('pausa')) {
    return 'facturacion-pausa'
  }
  if (key.includes('picking')) {
    return 'picking'
  }
  if (key.includes('packing')) {
    return 'packing'
  }
  if (key.includes('facturacion') || key.includes('factura')) {
    return 'facturacion-disponible'
  }
  if (key.includes('verif')) {
    return 'verificacion'
  }
  if (key.includes('desp')) {
    return 'despacho'
  }
  if (key.includes('envi') || key.includes('traslad')) {
    return 'enviado'
  }

  return 'default'
}

export function isCreditoMetodoPago(metodoPago) {
  const key = normalizeKey(metodoPago)
  return key === 'credito' || key.includes('credito')
}
