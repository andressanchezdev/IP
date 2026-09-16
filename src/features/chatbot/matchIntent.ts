import { stripAccents } from './normalizeText'
import { livePartAliases, liveWeakLexemes } from './motoParts'
import { liveProtectedTokens } from './unmatchedKind'
import { liveLexiconMap, liveLexiconSet } from './botip/liveData'
import { isStopToken } from './prepare'

export const TYPO_ALIASES: Record<string, string> = {
  wasap: 'whatsapp',
  wassap: 'whatsapp',
  whatsap: 'whatsapp',
  whatsapp: 'whatsapp',
  whastapp: 'whatsapp',
  whatssap: 'whatsapp',
  wsp: 'whatsapp',
  wa: 'whatsapp',
  tienene: 'tienen',
  tienen: 'tienen',
  catalgo: 'catalogo',
  catalogo: 'catalogo',
  katalogo: 'catalogo',
  catologo: 'catalogo',
  kntacto: 'contacto',
  contato: 'contacto',
  qeja: 'queja',
  keja: 'queja',
  reklamo: 'reclamo',
  reclamo: 'reclamo',
  direccion: 'direccion',
  ubicacion: 'ubicacion',
  asesore: 'asesor',
  aseror: 'asesor',
  asesorres: 'asesores',
  llantra: 'llanta',
  llantras: 'llanta',
}

function aliases() {
  return { ...liveLexiconMap('typoAliases', TYPO_ALIASES), ...livePartAliases() }
}

function complaintLock() {
  return liveLexiconSet('complaintLock', new Set(COMPLAINT_LOCK_LIST))
}

export function editDistance(left: string, right: string) {
  if (left === right) return 0
  if (!left.length) return right.length
  if (!right.length) return left.length

  const rows = left.length + 1
  const cols = right.length + 1
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0))

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      )
    }
  }

  return matrix[left.length][right.length]
}

function maxDistance(token: string) {
  if (token.length < 6) return 1
  return 2
}

export const COMPLAINT_LOCK_LIST = ['queja', 'quejar', 'reclamo', 'reclamar', 'pqr', 'garantia', 'devolucion'] as const

export function expandStuckTokens(tokens: readonly string[], lexicon: readonly string[]): string[] {
  const terms = [...new Set(lexicon.map((item) => stripAccents(item.toLowerCase())))]
    .filter((item) => item.length >= 4)
    .sort((left, right) => right.length - left.length)
  const termSet = new Set(terms)
  const out: string[] = []
  for (const token of tokens) {
    const plain = stripAccents(token.toLowerCase())
    if (plain.length < 8 || termSet.has(plain) || aliases()[plain]) {
      out.push(plain)
      continue
    }
    let split = false
    for (const term of terms) {
      if (plain === term) break
      if (plain.endsWith(term) && plain.length >= term.length + 3) {
        const prefix = plain.slice(0, -term.length)
        if (isStopToken(prefix) || termSet.has(prefix) || aliases()[prefix] || prefix.length >= 4) {
          out.push(prefix, term)
          split = true
          break
        }
      }
      if (plain.startsWith(term) && plain.length >= term.length + 3) {
        const suffix = plain.slice(term.length)
        if (isStopToken(suffix) || termSet.has(suffix) || aliases()[suffix]) {
          out.push(term, suffix)
          split = true
          break
        }
      }
    }
    if (!split) out.push(plain)
  }
  return out
}

export function nearestLexiconGuess(tokens: readonly string[], lexicon: readonly string[]): string {
  let best = ''
  let bestDistance = 99
  const pool = [...new Set(lexicon.map((item) => stripAccents(item.toLowerCase())).filter((item) => item.length >= 4))]
  for (const token of tokens) {
    const plain = stripAccents(token.toLowerCase())
    if (plain.length < 4 || isStopToken(plain) || pool.includes(plain)) continue
    for (const word of pool) {
      if (Math.abs(word.length - plain.length) > maxDistance(plain)) continue
      const distance = editDistance(plain, word)
      if (distance <= 0 || distance > maxDistance(plain) || distance >= bestDistance) continue
      if (complaintLock().has(word) && !complaintLock().has(plain) && !aliases()[plain]) continue
      best = word
      bestDistance = distance
    }
  }
  return best
}

export function correctToken(token: string, dictionary: readonly string[]) {
  const plain = stripAccents(token.toLowerCase())
  if (aliases()[plain]) return aliases()[plain]
  if (liveProtectedTokens().has(plain) || liveWeakLexemes().has(plain)) return plain
  if (plain.length < 4) return plain

  let best = plain
  let bestDistance = maxDistance(plain) + 1

  for (const word of dictionary) {
    if (Math.abs(word.length - plain.length) > maxDistance(plain)) continue
    const distance = editDistance(plain, word)
    if (distance < bestDistance) {
      best = word
      bestDistance = distance
    }
  }

  if (complaintLock().has(best) && !complaintLock().has(plain) && !aliases()[plain]) return plain
  return bestDistance <= maxDistance(plain) ? best : plain
}

export function scoreKeywords(tokens: readonly string[], keywords: readonly string[]) {
  let score = 0
  for (const token of tokens) {
    if (liveWeakLexemes().has(token)) continue
    if (keywords.includes(token)) {
      score += 3
      continue
    }
    if (liveProtectedTokens().has(token)) continue
    const near = keywords.some((keyword) => {
      if (Math.abs(keyword.length - token.length) > maxDistance(token)) return false
      return editDistance(token, keyword) <= maxDistance(token)
    })
    if (near) score += 2
  }
  return score
}

export function scoreMatch(tokens: readonly string[], keywords: readonly string[]) {
  let score = 0
  const matched: string[] = []
  for (const token of tokens) {
    if (token.length < 3) continue
    if (liveWeakLexemes().has(token)) continue
    if (keywords.includes(token)) {
      score += 5
      matched.push(token)
      continue
    }
    const partial = keywords.find(
      (keyword) =>
        keyword.length >= 5 &&
        token.length >= 5 &&
        (keyword.startsWith(token) || token.startsWith(keyword)),
    )
    if (partial) {
      score += 3
      matched.push(token)
      continue
    }
    if (liveProtectedTokens().has(token)) continue
    const near = keywords.find((keyword) => {
      if (Math.abs(keyword.length - token.length) > maxDistance(token)) return false
      return editDistance(token, keyword) <= maxDistance(token)
    })
    if (near) {
      score += 2
      matched.push(token)
    }
  }
  return { score, matched }
}

export function correctTokensContextual(
  tokens: readonly string[],
  dictionary: readonly string[],
  preferred: readonly string[] = [],
) {
  const prefer = new Set(preferred.filter(Boolean))
  return tokens.map((token) => {
    const plain = stripAccents(token.toLowerCase())
  if (aliases()[plain]) return aliases()[plain]
  if (liveProtectedTokens().has(plain) || liveWeakLexemes().has(plain) || plain.length < 4) return plain

  const hits: Array<{ word: string; distance: number }> = []
  const pool = [...prefer, ...dictionary]
  const seen = new Set<string>()
  for (const word of pool) {
    if (!word || seen.has(word)) continue
    seen.add(word)
    if (Math.abs(word.length - plain.length) > maxDistance(plain)) continue
    const distance = editDistance(plain, word)
    if (distance > 1 && plain.length >= 5 && word.length >= 5 && plain.slice(0, 4) !== word.slice(0, 4)) continue
    if (distance <= maxDistance(plain)) hits.push({ word, distance })
  }
    hits.sort((left, right) => left.distance - right.distance)
    if (!hits.length) return plain
    const best = hits[0]
    const tied = hits.filter((item) => item.distance === best.distance)
    if (tied.length > 1) {
      const preferredHit = tied.find((item) => prefer.has(item.word))
      return preferredHit ? preferredHit.word : plain
    }
    if (complaintLock().has(best.word) && !complaintLock().has(plain) && !aliases()[plain]) return plain
    return best.word
  })
}
