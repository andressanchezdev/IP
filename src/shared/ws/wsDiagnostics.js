/**
 * Diagnóstico en DEV de payloads WS que no se pudieron normalizar.
 */
export function describeUnparseableWsPayload(rawData) {
  if (rawData == null) {
    return { reason: 'payload_null', preview: String(rawData) }
  }

  if (typeof rawData === 'string') {
    const trimmed = rawData.trim()
    if (!trimmed || trimmed === 'undefined') {
      return { reason: 'string_vacia_o_undefined', preview: trimmed.slice(0, 300) }
    }

    try {
      const parsed = JSON.parse(trimmed)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {
          reason: 'json_no_es_objeto',
          preview: trimmed.slice(0, 300),
          parsedType: Array.isArray(parsed) ? 'array' : typeof parsed,
        }
      }

      const tipo = String(parsed.tipo ?? '').trim()
      if (!tipo) {
        return {
          reason: 'sin_campo_tipo',
          preview: trimmed.slice(0, 300),
          keys: Object.keys(parsed),
          sample: parsed,
        }
      }

      return {
        reason: 'desconocido',
        preview: trimmed.slice(0, 300),
        tipo,
        keys: Object.keys(parsed),
      }
    } catch (error) {
      return {
        reason: 'json_invalido',
        preview: trimmed.slice(0, 300),
        error: error?.message || String(error),
      }
    }
  }

  if (typeof rawData === 'object') {
    if (Array.isArray(rawData)) {
      return { reason: 'payload_es_array', preview: rawData }
    }
    const tipo = String(rawData.tipo ?? '').trim()
    if (!tipo) {
      return {
        reason: 'sin_campo_tipo',
        keys: Object.keys(rawData),
        sample: rawData,
      }
    }
  }

  return {
    reason: 'tipo_raw_no_soportado',
    rawType: typeof rawData,
    preview: rawData,
  }
}
