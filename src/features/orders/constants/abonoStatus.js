/** Estados de abono a crédito (local hasta existir API). */
export const ABONO_STATUS = Object.freeze({
  REVISION: 'revision',
  VERIFICADO: 'verificado',
  NOVEDAD: 'novedad',
})

export const ABONO_STATUS_LABEL = Object.freeze({
  [ABONO_STATUS.REVISION]: 'En revisión',
  [ABONO_STATUS.VERIFICADO]: 'Verificado',
  [ABONO_STATUS.NOVEDAD]: 'Novedad encontrada',
})

/** Abonos legacy (sin status) ya aplicaban al saldo → se tratan como verificados. */
export function resolveAbonoStatus(entry) {
  const raw = String(entry?.status || '').trim().toLowerCase()
  if (raw === ABONO_STATUS.REVISION || raw === 'pendiente') {
    return ABONO_STATUS.REVISION
  }
  if (raw === ABONO_STATUS.NOVEDAD) {
    return ABONO_STATUS.NOVEDAD
  }
  if (raw === ABONO_STATUS.VERIFICADO) {
    return ABONO_STATUS.VERIFICADO
  }
  return ABONO_STATUS.VERIFICADO
}

export function sumVerifiedAbonos(payments = []) {
  return (Array.isArray(payments) ? payments : []).reduce((sum, entry) => {
    if (resolveAbonoStatus(entry) !== ABONO_STATUS.VERIFICADO) {
      return sum
    }
    const amount = Number(entry?.amount)
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)
}

/** Reserva: revisión + verificado (novedad no reserva cupo). */
export function sumReservedAbonos(payments = []) {
  return (Array.isArray(payments) ? payments : []).reduce((sum, entry) => {
    const status = resolveAbonoStatus(entry)
    if (status === ABONO_STATUS.NOVEDAD) {
      return sum
    }
    const amount = Number(entry?.amount)
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)
}

export function getCreditRemainingDue(total, payments = []) {
  const safeTotal = Number(total) || 0
  return Math.max(0, safeTotal - sumVerifiedAbonos(payments))
}

export function getCreditRemainingForNewAbono(total, payments = []) {
  const safeTotal = Number(total) || 0
  return Math.max(0, safeTotal - sumReservedAbonos(payments))
}
