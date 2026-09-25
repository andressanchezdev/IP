import { FISCAL_KEYS, pickProductFiscalFields } from './productFiscalFields'

const summariesBySource = new Map()

function isDev() {
  try {
    return Boolean(import.meta.env?.DEV)
  } catch {
    return false
  }
}

function sampleValue(value) {
  if (value === undefined) {
    return { present: false }
  }
  return {
    present: true,
    type: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
    value,
  }
}

function inspectRawProduct(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const keys = Object.keys(raw)
  const fiscalHits = {}
  for (const key of FISCAL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      fiscalHits[key] = sampleValue(raw[key])
    }
  }

  return {
    id: raw.id ?? raw.id_producto ?? null,
    keys,
    fiscalHits,
    mapped: pickProductFiscalFields(raw),
  }
}

/**
 * Auditoría solo lectura (DEV): inventario de claves fiscales por fuente.
 * Fuentes: general | products | search | latest | filter | list | cart
 *
 * Forma confirmada en GET /api/v1/general:
 *   iva (number %), exento (0|1), compra (number) — no `purchase`/`exept`.
 */
export function auditProductFiscalFields(rawItems = [], source = 'unknown') {
  if (!isDev()) {
    return null
  }

  const list = Array.isArray(rawItems) ? rawItems : []
  const keyFrequency = new Map()
  const fiscalPresence = {
    iva: 0,
    exento: 0,
    compra: 0,
    purchase: 0,
    exept: 0,
    except: 0,
    exempt: 0,
  }
  const examples = []

  for (const raw of list) {
    const inspected = inspectRawProduct(raw)
    if (!inspected) {
      continue
    }
    for (const key of inspected.keys) {
      keyFrequency.set(key, (keyFrequency.get(key) || 0) + 1)
    }
    for (const key of Object.keys(fiscalPresence)) {
      if (inspected.fiscalHits[key]?.present) {
        fiscalPresence[key] += 1
      }
    }
    if (examples.length < 3) {
      examples.push({
        id: inspected.id,
        fiscal: inspected.mapped,
        hits: inspected.fiscalHits,
      })
    }
  }

  const summary = {
    source,
    count: list.length,
    fiscalPresence,
    topKeys: [...keyFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([key, n]) => `${key}:${n}`),
    examples,
    // Contrato confirmado contra respuesta real de /general (sep 2026).
    confirmedContract: {
      iva: 'number (tasa %; 0 o 19 observados)',
      exento: 'number 0|1 (flag; el cálculo usa tasa `iva`)',
      compra: 'number (costo; no confundir con precio de venta)',
      aliasesNotUsed: ['purchase', 'exept', 'except', 'exempt'],
    },
  }

  summariesBySource.set(source, summary)

  // Un solo log agrupado por fuente para no saturar la consola en scroll.
  console.info(`[fiscal-audit:${source}]`, summary)

  return summary
}

export function getFiscalAuditSummaries() {
  return Object.fromEntries(summariesBySource.entries())
}
