export function formatOrderDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const time = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  return `${yyyy}/${mm}/${dd} ${time}`
}

export function formatRelativeTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) {
    return 'hace unos minutos'
  }

  if (diffHours < 24) {
    return `hace ${diffHours} hora${diffHours === 1 ? '' : 's'}`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `hace ${diffDays} día${diffDays === 1 ? '' : 's'}`
}

export function formatRealAmount(value) {
  return `$${Number(value).toLocaleString('es-CO')}`
}
