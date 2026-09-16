import { stripAccents } from './normalizeText'
import { isStopToken } from './prepare'

const INTRO_RE =
  /(?:mi\s+nombre\s+es|me\s+llamo|me\s+dicen|yo\s+soy|(?:^|\s)soy)\s+([a-z0-9áéíóúñü]+(?:\s+[a-z0-9áéíóúñü]+){0,2})/i

const TEAM_CUE = new Set([
  'asesor',
  'asesores',
  'asesora',
  'asesoras',
  'equipo',
  'colaborador',
  'colaboradores',
  'administrativo',
  'administrativos',
  'telefono',
  'whatsapp',
  'contacto',
  'hablar',
  'llamar',
  'carrusel',
])

const ROLE_OR_PLACE = new Set([
  'asesor',
  'cliente',
  'de',
  'medellin',
  'colombia',
  'importadora',
  'premium',
])

export type UserFrame = {
  userName: string
  introducingSelf: boolean
  lookupTokens: string[]
  hasTeamCue: boolean
}

function fold(value: string) {
  return stripAccents(value.toLowerCase()).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim()
}

function nameTokens(name: string) {
  return fold(name)
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 1 && !isStopToken(part))
}

export function parseUserFrame(raw: string, tokens: readonly string[]): UserFrame {
  const text = fold(raw)
  const intro = text.match(INTRO_RE)
  let userName = ''
  if (intro?.[1]) {
    const candidate = intro[1].trim()
    const first = candidate.split(/\s+/)[0] || ''
    if (first && !ROLE_OR_PLACE.has(first) && first.length >= 3) {
      userName = candidate
        .split(/\s+/)
        .filter((part) => !ROLE_OR_PLACE.has(part) && !isStopToken(part))
        .slice(0, 3)
        .join(' ')
    }
  }

  const introducingSelf = Boolean(userName)
  const skip = new Set(introducingSelf ? ['nombre', 'llamo', 'dicen', 'soy', ...nameTokens(userName)] : [])
  const lookupTokens = tokens.filter((token) => !skip.has(token))
  const hasTeamCue = tokens.some((token) => TEAM_CUE.has(token))

  return { userName, introducingSelf, lookupTokens, hasTeamCue }
}

export function isTeamNameLookupAllowed(frame: UserFrame, lastTopIntent: string | null, pendingIntent: string | null) {
  if (frame.hasTeamCue) return true
  if (pendingIntent && /team|promptChoice|attention/i.test(pendingIntent)) return true
  if (lastTopIntent && /team|attention/i.test(lastTopIntent)) return true
  if (frame.introducingSelf) return false
  return true
}
