import type { LandingTeamGroup, LandingTeamMember } from './types'
import { livePublishedTeam, liveTeam } from './botip/liveData'
import { liveLexiconRecord, liveLexiconSet } from './botip/liveData'
import { editDistance } from './matchIntent'
import { stripAccents } from './normalizeText'
import { isStopToken } from './prepare'

export const ROLE_WORDS: Record<LandingTeamGroup, readonly string[]> = {
  asesor: [
    'asesor',
    'asesores',
    'asesora',
    'asesoras',
    'asesore',
    'vendedor',
    'vendedores',
    'vendedora',
    'vendedoras',
    'gerente',
    'gerentes',
    'ejecutivo',
    'ejecutivos',
    'ejecutiva',
  ],
  administrativo: [
    'administrativo',
    'administrativos',
    'administrativa',
    'administrativas',
    'admin',
    'admins',
    'administra',
    'administrador',
    'administradoras',
    'administradora',
  ],
}

export const TEAM_ALL_LIST = ['equipo', 'equipos', 'colaboradores', 'personal', 'staff'] as const
const TEAM_ALL_WORDS = new Set<string>(TEAM_ALL_LIST)
export const TEAM_FILLER_LIST = [
  'hablar',
  'contactar',
  'contacto',
  'equipo',
  'equipos',
  'mostrar',
  'lista',
  'listado',
  'quienes',
  'quien',
  'hay',
  'nuestro',
  'nuestra',
  'nuestros',
  'nuestras',
  'ayudame',
  'ayuda',
  'ayudar',
  'contratar',
  'para',
  'quiero',
  'necesito',
  'busco',
  'algun',
  'alguno',
  'alguna',
  'preferencia',
  'identificar',
  'nombre',
  'nombres',
  'persona',
  'humano',
  'real',
  'pasar',
  'conecta',
  'conectar',
  'pasame',
  'comunicar',
  'comunicarme',
  'llamar',
  'atencion',
  'atender',
  'preferido',
  'prefiero',
  'conocer',
  'presentame',
  'presentar',
  'colaboradores',
  'personal',
  'staff',
  'con',
  'son',
  'estan',
  'somos',
  'eres',
  'ser',
  'entonces',
  'pregunto',
  'preguntar',
  'preguntarle',
  'pregunta',
  'existe',
  'existen',
  'existencias',
  'llamo',
  'llamada',
  'llamarle',
  'debo',
  'conviene',
  'elijo',
  'elegir',
  'elige',
  'opcion',
  'opciones',
  'carrusel',
  'pagina',
  'landing',
  'mejor',
  'ajuste',
  'perfil',
  'atienda',
  'atiende',
  'puedo',
  'cuales',
  'cual',
] as const
const FILLER = new Set<string>(TEAM_FILLER_LIST)
const FOCUS_NOISE = new Set([
  'teamgroup',
  'teammember',
  'teamsuggest',
  'attention',
  'product',
  'quote',
  'company',
])

export type TeamMatch =
  | { type: 'member'; members: LandingTeamMember[] }
  | { type: 'group'; group: LandingTeamGroup; members: LandingTeamMember[] }
  | { type: 'all'; asesores: LandingTeamMember[]; administrativos: LandingTeamMember[] }
  | { type: 'suggest'; asked: string; member: LandingTeamMember }
  | null

function plain(value: string) {
  return stripAccents(value.toLowerCase())
}

function nameParts(member: LandingTeamMember) {
  return plain(member.fullName)
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 2)
}

function roleWords() {
  return liveLexiconRecord('roleWords', ROLE_WORDS)
}

function allRoleWords() {
  const roles = roleWords()
  return new Set([...Object.values(roles).flat()])
}

function teamAllWords() {
  return liveLexiconSet('teamAllWords', TEAM_ALL_WORDS)
}

function fillerWords() {
  return liveLexiconSet('teamFillers', FILLER)
}

export function publishedTeam() {
  return liveTeam().filter((item) => item.status === 'publicado')
}

export function groupLabel(group: LandingTeamGroup) {
  return group === 'asesor' ? 'Asesores' : 'Administrativos'
}

export function wantsAdvisorContact(tokens: readonly string[]) {
  return tokens.some((token) => (roleWords().asesor ?? ROLE_WORDS.asesor).includes(plain(token)))
}

export type AdvisorAskKind = 'ask' | 'exist' | 'call' | 'generic'

export function advisorAskKind(tokens: readonly string[]): AdvisorAskKind {
  const set = new Set(tokens.map(plain))
  if ([...set].some((token) => token.startsWith('pregunt'))) return 'ask'
  if (
    set.has('llamar') ||
    set.has('llamo') ||
    set.has('llamada') ||
    set.has('telefono') ||
    set.has('celular') ||
    set.has('carrusel')
  ) {
    return 'call'
  }
  if (set.has('existen') || set.has('existe') || set.has('quienes') || set.has('cuales')) return 'exist'
  return 'generic'
}

function exactMembers(tokens: readonly string[]) {
  const team = publishedTeam()
  return team.filter((member) => {
    const parts = nameParts(member)
    const folded = plain(member.fullName)
    const compact = folded.replace(/\s+/g, '')
    return tokens.some((token) => token === folded || token === compact || parts.includes(token))
  })
}

function closestMember(token: string) {
  if (token.length < 5) return null
  let best: LandingTeamMember | null = null
  let bestDistance = 2
  for (const member of publishedTeam()) {
    for (const part of nameParts(member)) {
      if (Math.abs(part.length - token.length) > 1) continue
      const distance = editDistance(token, part)
      if (distance === 0) return null
      if (distance < bestDistance) {
        best = member
        bestDistance = distance
      } else if (distance === bestDistance && best && best.id !== member.id) {
        return null
      }
    }
  }
  return bestDistance === 1 ? best : null
}

function allTeams(): Extract<TeamMatch, { type: 'all' }> {
  return {
    type: 'all',
    asesores: livePublishedTeam('asesor'),
    administrativos: livePublishedTeam('administrativo'),
  }
}

export function matchLandingTeam(
  tokens: readonly string[],
  options?: { allowNameLookup?: boolean; excludeNames?: readonly string[] },
): TeamMatch {
  const allowNameLookup = options?.allowNameLookup !== false
  const excluded = new Set((options?.excludeNames || []).map(plain))
  const normalized = tokens.map(plain)
  const cleaned = normalized.filter(
    (token) => token.length > 2 && !allRoleWords().has(token) && !excluded.has(token),
  )
  const exact = allowNameLookup ? exactMembers(cleaned) : []
  if (exact.length > 0) return { type: 'member', members: exact }

  const roles = roleWords()
  const roleGroups = (Object.keys(roles) as LandingTeamGroup[]).filter((group) =>
    normalized.some((token) => (roles[group] ?? []).includes(token)),
  )
  const leftover = cleaned.filter(
    (token) =>
      !fillerWords().has(token) &&
      !teamAllWords().has(token) &&
      !isStopToken(token) &&
      !FOCUS_NOISE.has(token),
  )
  const asksAll = normalized.some((token) => teamAllWords().has(token))

  if (roleGroups.length > 1 || (asksAll && roleGroups.length !== 1)) {
    return allTeams()
  }

  if (roleGroups.length === 1 && leftover.length === 0) {
    const group = roleGroups[0]
    return { type: 'group', group, members: livePublishedTeam(group) }
  }

  if (asksAll && leftover.length === 0) return allTeams()

  if (allowNameLookup && cleaned.length === 1) {
    const near = closestMember(cleaned[0])
    if (near) return { type: 'suggest', asked: cleaned[0], member: near }
  }

  return null
}
