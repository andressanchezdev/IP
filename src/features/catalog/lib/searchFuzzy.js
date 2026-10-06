/**
 * Núcleo puro de tolerancia a errores de escritura para la barra de búsqueda y el bot.
 * Sin dependencias del proyecto: se prueba con `node --test`.
 *
 * Lexicon: { words: Set<string>, roles: Map<string, Set<string>>, fixes: Record<string, string> }
 *   - roles: categoria | marca | modelo | pieza | conocido
 */

export function foldWord(value = '') {
  return String(value).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

/** Distancia de edición con transposición (Damerau, variante OSA): "libreo" → "libero" = 1. */
export function editDistance(left, right) {
  if (left === right) return 0
  if (!left.length) return right.length
  if (!right.length) return left.length
  const rows = left.length + 1
  const cols = right.length + 1
  const matrix = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0))
  for (let row = 0; row < rows; row += 1) matrix[row][0] = row
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1
      let value = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      )
      if (
        row > 1
        && col > 1
        && left[row - 1] === right[col - 2]
        && left[row - 2] === right[col - 1]
      ) {
        value = Math.min(value, matrix[row - 2][col - 2] + 1)
      }
      matrix[row][col] = value
    }
  }
  return matrix[left.length][right.length]
}

/** Clave fonética del español escrito: b/v, s/z/c, ll/y, h muda, qu/k, g/j. */
export function phoneticKey(token = '') {
  return foldWord(token)
    .replace(/[^a-z0-9]/g, '')
    .replace(/h/g, '')
    .replace(/ll/g, 'y')
    .replace(/qu/g, 'k')
    .replace(/c([ei])/g, 's$1')
    .replace(/c/g, 'k')
    .replace(/z/g, 's')
    .replace(/[vw]/g, 'b')
    .replace(/g([ei])/g, 'j$1')
    .replace(/(.)\1+/g, '$1')
}

/** Relleno al pedir ("necesito", "tienen", "precio de"): no es parte del producto. */
const SEARCH_FILLERS = new Set([
  'necesito', 'necesitamos', 'necesita', 'busco', 'buscando', 'buscamos',
  'quiero', 'quisiera', 'queremos', 'tienen', 'tiene', 'tienes', 'tengan', 'hay',
  'favor', 'porfa', 'porfavor', 'precio', 'precios', 'cuanto', 'cuesta', 'vale', 'valor',
  'disponible', 'disponibles', 'ayuda', 'hola', 'buenas', 'buenos', 'dias', 'tardes', 'noches',
  'gracias',
])

/** Quita relleno y letras sueltas; si todo fuera ruido, devuelve los tokens tal cual. */
export function dropSearchNoise(tokens) {
  const clean = tokens.filter(Boolean)
  const meaningful = clean.filter((token) => (
    !SEARCH_FILLERS.has(token) && (token.length > 1 || /\d/.test(token))
  ))
  return meaningful.length ? meaningful : clean
}

function maxEditDistance(tokenLength) {
  if (tokenLength >= 8) return 2
  if (tokenLength >= 5) return 1
  return 0
}

const ROLE_PRIORITY = ['categoria', 'marca', 'modelo', 'pieza', 'conocido']

function rolePriority(lexicon, word) {
  const roles = lexicon.roles?.get(word)
  if (!roles) return ROLE_PRIORITY.length
  const indexes = [...roles].map((role) => ROLE_PRIORITY.indexOf(role)).filter((index) => index >= 0)
  return indexes.length ? Math.min(...indexes) : ROLE_PRIORITY.length
}

/** "espejo" y "espejos" son la misma palabra: no se corrige una por la otra. */
export function hasInflection(token, words) {
  if (words.has(`${token}s`) || words.has(`${token}es`)) return true
  if (token.endsWith('s') && words.has(token.slice(0, -1))) return true
  if (token.endsWith('es') && words.has(token.slice(0, -2))) return true
  return false
}

function pickBest(token, candidates, lexicon) {
  return candidates
    .map((word) => ({
      word,
      dist: editDistance(token, word),
      sameStart: word[0] === token[0] ? 0 : 1,
      lenGap: Math.abs(word.length - token.length),
      role: rolePriority(lexicon, word),
    }))
    .sort((a, b) => (
      a.dist - b.dist
      || a.sameStart - b.sameStart
      || a.lenGap - b.lenGap
      || a.role - b.role
      || a.word.localeCompare(b.word)
    ))[0]
}

/**
 * Corrige un token contra el vocabulario del catálogo.
 * Orden: fix fijo → palabra exacta → misma pronunciación → 1-2 letras de diferencia →
 * palabra corta con una sola candidata → palabra truncada.
 * Los tokens con dígitos (códigos, medidas, modelos) no se tocan.
 */
export function resolveVocabToken(token, lexicon) {
  if (!token || /\d/.test(token)) return token
  const fixed = lexicon.fixes?.[token]
  if (fixed) return fixed
  if (lexicon.words.has(token)) return token
  if (token.length < 4) return token
  if (hasInflection(token, lexicon.words)) return token

  const key = phoneticKey(token)
  const phonetic = []
  const near = []
  const short = []
  const truncated = []
  const maxDist = maxEditDistance(token.length)

  for (const word of lexicon.words) {
    if (/\d/.test(word)) continue
    const gap = Math.abs(word.length - token.length)
    if (gap <= 1 && word.length >= 4 && phoneticKey(word) === key) phonetic.push(word)
    if (maxDist && gap <= maxDist && editDistance(token, word) <= maxDist) near.push(word)
    if (
      token.length === 4
      && word.length >= 4
      && gap <= 1
      && word[0] === token[0]
      && editDistance(token, word) <= 1
    ) {
      short.push(word)
    }
    if (token.length >= 5 && word.length > token.length && word.startsWith(token)) truncated.push(word)
  }

  if (phonetic.length) return pickBest(token, phonetic, lexicon).word
  if (near.length) return pickBest(token, near, lexicon).word
  if (short.length === 1) return short[0]
  if (truncated.length) {
    return truncated.sort((a, b) => a.length - b.length || a.localeCompare(b))[0]
  }
  return token
}

/** Palabra del vocabulario a la que equivale el token completo, o null. */
function resolveWhole(token, lexicon) {
  const resolved = resolveVocabToken(token, lexicon)
  if (lexicon.words.has(resolved)) return resolved
  if (resolved === token && hasInflection(token, lexicon.words)) return token
  return null
}

/** Dos palabras exactas pegadas: "espejoslibero" → ["espejos", "libero"]. */
export function splitStuckToken(token, lexicon) {
  if (!token || lexicon.words.has(token)) return [token]
  const lettersDigits = token.match(/^([a-z]{3,})(\d{2,})$/)
  if (lettersDigits) return [lettersDigits[1], lettersDigits[2]]
  const digitsLetters = token.match(/^(\d{2,})([a-z]{3,})$/)
  if (digitsLetters) return [digitsLetters[1], digitsLetters[2]]
  if (token.length < 6) return [token]
  let best = null
  for (let cut = 3; cut <= token.length - 3; cut += 1) {
    const left = token.slice(0, cut)
    const right = token.slice(cut)
    if (!lexicon.words.has(left) || !lexicon.words.has(right)) continue
    const score = Math.min(left.length, right.length)
    if (!best || score > best.score) best = { parts: [left, right], score }
  }
  return best ? best.parts : [token]
}

/** Dos palabras pegadas y con errores: "amortiguadorlibreo" → ["amortiguador", "libero"]. */
export function splitStuckFuzzy(token, lexicon) {
  if (!token || token.length < 8) return null
  let best = null
  for (let cut = 4; cut <= token.length - 4; cut += 1) {
    const rawLeft = token.slice(0, cut)
    const rawRight = token.slice(cut)
    const left = resolveWhole(rawLeft, lexicon)
    const right = resolveWhole(rawRight, lexicon)
    if (!left || !right) continue
    const errors = editDistance(rawLeft, left) + editDistance(rawRight, right)
    if (errors > 2) continue
    const score = Math.min(left.length, right.length) * 10 - errors
    if (!best || score > best.score) best = { parts: [left, right], score }
  }
  return best ? best.parts : null
}

/** Une fragmentos de una palabra cortada con espacio: ["amorti", "guador"] → ["amortiguador"]. */
export function joinFragments(tokens, lexicon) {
  const out = []
  for (let index = 0; index < tokens.length; index += 1) {
    const current = tokens[index]
    const next = tokens[index + 1]
    if (
      next
      && !/\d/.test(current + next)
      && !lexicon.words.has(current)
      && !lexicon.words.has(next)
      && current.length + next.length >= 6
    ) {
      const merged = resolveVocabToken(`${current}${next}`, lexicon)
      if (lexicon.words.has(merged)) {
        out.push(merged)
        index += 1
        continue
      }
    }
    out.push(current)
  }
  return out
}

function processToken(token, lexicon) {
  if (!token) return []
  if (/^\d+$/.test(token) || lexicon.words.has(token)) return [token]

  const lettersDigits = token.match(/^([a-z]{3,})(\d{2,})$/)
  if (lettersDigits) return [...processToken(lettersDigits[1], lexicon), lettersDigits[2]]
  const digitsLetters = token.match(/^(\d{2,})([a-z]{3,})$/)
  if (digitsLetters) return [digitsLetters[1], ...processToken(digitsLetters[2], lexicon)]
  if (/\d/.test(token)) return [token]

  const whole = resolveWhole(token, lexicon)
  if (whole) return [whole]

  const exact = splitStuckToken(token, lexicon)
  if (exact.length > 1) return exact
  const fuzzy = splitStuckFuzzy(token, lexicon)
  if (fuzzy) return fuzzy
  return [token]
}

/**
 * Tokens ya normalizados → tokens corregidos.
 * Une palabras cortadas, quita relleno, separa pegadas y corrige cada una.
 */
export function correctQueryTokens(tokens, lexicon) {
  const joined = joinFragments(tokens.filter(Boolean), lexicon)
  return dropSearchNoise(joined).flatMap((token) => processToken(token, lexicon))
}

function isCategoryLike(lexicon, token) {
  const roles = lexicon.roles?.get(token)
  if (!roles) return false
  return [...roles].every((role) => role === 'categoria' || role === 'pieza')
}

/**
 * Intentos de búsqueda de mayor a menor detalle.
 * 1) primary (lo que hoy se envía)   2) texto limpio completo
 * 3) solo términos reconocidos (categoría/marca/modelo/pieza), sin ruido suelto
 * 4) solo marca/modelo (el ranking sube la categoría pedida al inicio)
 * El API solo se consulta con el siguiente intento si el anterior no devolvió productos.
 */
export function buildRelaxedAttempts({ primary = '', cleaned = '', lexicon }) {
  const seen = new Set()
  const attempts = []
  const push = (value) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim()
    if (!text || seen.has(text)) return
    seen.add(text)
    attempts.push(text)
  }

  push(primary)
  push(cleaned)

  const tokens = String(cleaned || '').split(' ').filter(Boolean)
  const known = tokens.filter((token) => lexicon.roles?.has(token))
  if (known.length && known.length < tokens.length) push(known.join(' '))

  const specific = known.filter((token) => !isCategoryLike(lexicon, token))
  if (specific.length && specific.length < known.length) push(specific.join(' '))
  return attempts
}
