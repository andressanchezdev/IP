/** Texto seguro para fuentes estándar de jsPDF (Latin-1 limitado). */
const ACCENT_MAP = {
  '\u00C1': 'A',
  '\u00C9': 'E',
  '\u00CD': 'I',
  '\u00D3': 'O',
  '\u00DA': 'U',
  '\u00DC': 'U',
  '\u00D1': 'N',
  '\u00E1': 'a',
  '\u00E9': 'e',
  '\u00ED': 'i',
  '\u00F3': 'o',
  '\u00FA': 'u',
  '\u00FC': 'u',
  '\u00F1': 'n',
  '\u00BF': '?',
  '\u00A1': '!',
}

export function pdfText(value) {
  return String(value ?? '')
    .replace(/[\u00C1\u00C9\u00CD\u00D3\u00DA\u00DC\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00F1\u00BF\u00A1]/g, (char) => ACCENT_MAP[char] || char)
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim()
}

export function pdfTruncate(value, maxLen) {
  const text = pdfText(value)
  if (text.length <= maxLen) {
    return text
  }
  return `${text.slice(0, Math.max(0, maxLen - 1))}...`
}

export function formatPdfDate(date = new Date()) {
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
