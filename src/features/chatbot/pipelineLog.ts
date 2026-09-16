export type PhaseName =
  | 'preProcess'
  | 'normalize'
  | 'tokenize'
  | 'inputQuality'
  | 'updateContext'
  | 'filter'
  | 'detectRepeated'
  | 'typos'
  | 'entities'
  | 'scoring'
  | 'rank'
  | 'decision'
  | 'resolve'
  | 'handler'
  | 'antiRepeat'
  | 'finalize'
  | 'emit'
  | 'error'

export type PhaseLogEntry = {
  turn: number
  phase: PhaseName
  detail: string
}

export type SessionMetrics = {
  unmatched: number
  consecutiveRepeats: number
  disambiguations: number
  handoffs: number
  handlerErrors: number
  languageWarnings: number
}

export function emptyMetrics(): SessionMetrics {
  return {
    unmatched: 0,
    consecutiveRepeats: 0,
    disambiguations: 0,
    handoffs: 0,
    handlerErrors: 0,
    languageWarnings: 0,
  }
}

const LOG_LIMIT = 80

export function pushPhaseLog(log: PhaseLogEntry[], entry: PhaseLogEntry) {
  log.push(entry)
  if (log.length > LOG_LIMIT) log.splice(0, log.length - LOG_LIMIT)
  return log
}
