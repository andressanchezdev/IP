/**
 * Unique non-empty trimmed strings, sorted with Spanish locale.
 */
export function uniqueSorted(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}
