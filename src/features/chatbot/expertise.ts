import { resolvePartFamily, livePartAliases } from './motoParts'
import { extractMarcaModelo } from './entities'

const EXTRA_ALIASES: Record<string, string> = {
  pastiya: 'pastilla',
  pastiyas: 'pastilla',
  pasta: 'pastilla',
  pastas: 'pastilla',
  balata: 'pastilla',
  balatas: 'pastilla',
  pad: 'pastilla',
  pads: 'pastilla',
  rotor: 'disco',
  disc: 'disco',
  caliper: 'mordaza',
  calipers: 'mordaza',
  pinza: 'mordaza',
  yanta: 'llanta',
  yantas: 'llanta',
  llantra: 'llanta',
  llantras: 'llanta',
  neumatico: 'llanta',
  caucho: 'llanta',
  carena: 'carenado',
  carenaje: 'carenado',
  carenajes: 'carenado',
  rinspa: 'rin',
  rinaspa: 'rin',
  aro: 'rin',
  pinhon: 'pinon',
  pignon: 'pinon',
  sprocket: 'corona',
  shock: 'amortiguador',
  telescopio: 'barras',
  horquilla: 'barras',
  arnes: 'ramal',
  cableado: 'ramal',
  acumulador: 'bateria',
  battery: 'bateria',
  embrague: 'clutch',
}

export const PART_KNOWLEDGE: Record<string, string> = {
  pasta: 'Elemento de fricción que presiona el disco o tambor para detener la rueda. Se desgasta con el uso. En el taller se llama pastilla de freno.',
  pastas: 'Elemento de fricción que presiona el disco o tambor para detener la rueda. Se desgasta con el uso. En el taller se llama pastilla de freno.',
  pastilla: 'Elemento de fricción que presiona el disco o tambor para detener la rueda. Se desgasta con el uso.',
  pastillas: 'Elemento de fricción que presiona el disco o tambor para detener la rueda. Se desgasta con el uso.',
  disco: 'Superficie metálica que gira con la rueda y es frenada por las pastillas.',
  mordaza: 'Pinza hidráulica que empuja las pastillas contra el disco.',
  llanta: 'Neumático que hace contacto con el suelo y brinda agarre, amortiguación y tracción.',
  rin: 'Estructura metálica que sostiene la llanta y se fija al eje.',
  cadena: 'Elemento que transmite la fuerza del motor a la rueda trasera en motos.',
  corona: 'Piñón trasero que recibe la cadena y transmite el movimiento a la rueda.',
  pinon: 'Piñón delantero que sale de la caja y empuja la cadena.',
  aceite: 'Lubricante que reduce fricción, refrigera y limpia internamente el motor.',
  amortiguador: 'Elemento que controla el rebote de la suspensión y mejora la estabilidad.',
  barras: 'Tubos telescópicos de la horquilla delantera que absorben impactos.',
  eje: 'Barra que centra la rueda y transmite torque.',
  ramal: 'Arnés de cables que conecta los componentes eléctricos.',
  bateria: 'Acumulador que suministra energía eléctrica al vehículo.',
  bujia: 'Elemento que genera la chispa para encender la mezcla en el motor.',
  filtro: 'Elemento que retiene impurezas del aceite, aire o combustible.',
  clutch: 'Sistema que conecta y desconecta el motor de la transmisión.',
  cdi: 'Módulo que controla el encendido y la chispa del motor.',
}

type SymptomRule = {
  pattern: RegExp
  label: string
  candidates: string[]
}

const SYMPTOM_RULES: SymptomRule[] = [
  { pattern: /no frena|frena duro|frena mal|chirria al fren/, label: 'problema de frenado', candidates: ['pastillas', 'disco', 'mordaza'] },
  { pattern: /se va de lado|inestable|rebota mucho/, label: 'inestabilidad', candidates: ['amortiguador', 'barras', 'llanta'] },
  { pattern: /no arranca|se apaga|falla el encendido/, label: 'falla de encendido', candidates: ['bateria', 'bujia', 'cdi'] },
  { pattern: /halonea|pierde fuerza|tirones/, label: 'pérdida de fuerza', candidates: ['filtro', 'bujia', 'cadena'] },
  { pattern: /hace ruido al andar|golpeteo/, label: 'ruido al andar', candidates: ['cadena', 'rodamiento', 'eje'] },
  { pattern: /pierde aceite|fuga de aceite/, label: 'fuga de aceite', candidates: ['empaque', 'reten', 'filtro'] },
  { pattern: /se calienta|sube temperatura/, label: 'sobrecalentamiento', candidates: ['refrigerante', 'radiador'] },
  { pattern: /luces no encienden|no carga/, label: 'falla eléctrica', candidates: ['bateria', 'regulador', 'fusible'] },
  { pattern: /vibra mucho|se siente suelto/, label: 'vibración', candidates: ['llanta', 'rin', 'rodamiento'] },
  { pattern: /no cambia bien|patina/, label: 'falla de cambios', candidates: ['clutch', 'cadena'] },
  { pattern: /la cosa que frena|lo que frena/, label: 'sistema de freno', candidates: ['pastillas', 'disco', 'mordaza'] },
]

function fold(raw = '') {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function expandPartSynonyms(tokens: readonly string[], raw = '') {
  const aliases = { ...EXTRA_ALIASES, ...livePartAliases() }
  const extra: string[] = []
  const seen = new Set(tokens)
  for (const token of tokens) {
    const mapped = aliases[fold(token)] || aliases[token]
    if (!mapped || seen.has(mapped)) continue
    seen.add(mapped)
    extra.push(mapped)
  }
  const blob = fold(`${tokens.join(' ')} ${raw}`)
  if (/\bpastas?(?:\s+de(?:\s+freno)?)?\b/.test(blob)) {
    for (const mapped of ['pastilla', 'pastillas']) {
      if (seen.has(mapped)) continue
      seen.add(mapped)
      extra.push(mapped)
    }
  }
  return extra.length ? [...tokens, ...extra] : [...tokens]
}

export function matchSymptom(raw = '') {
  const text = fold(raw)
  if (!text) return null
  for (const rule of SYMPTOM_RULES) {
    if (rule.pattern.test(text)) return { label: rule.label, candidates: rule.candidates }
  }
  return null
}

export function isCompatibilityAsk(raw = '') {
  const text = fold(raw)
  return /\b(sirve para|es compatible|le queda|funciona en|entra en)\b/.test(text)
}

export function isExplainPartAsk(raw = '') {
  const text = fold(raw)
  return /\b(para que sirve|que hace|que es (un |una |el |la )?)/.test(text) && !isCompatibilityAsk(raw)
}

export function needsVehicleForCompat(tokens: readonly string[], raw = '') {
  if (!isCompatibilityAsk(raw)) return false
  const vehicle = extractMarcaModelo(tokens, raw)
  return !vehicle.marca || !vehicle.modelo
}

export function explainPartText(tokens: readonly string[]) {
  const family = resolvePartFamily(tokens)
  const key = family?.id?.replace(/_freno$/, '') || family?.label || ''
  const stem = key.split('_')[0]
  const knowledge = PART_KNOWLEDGE[stem] || PART_KNOWLEDGE[family?.label || '']
  const label = family?.label || stem
  if (!label || !knowledge) return null
  return { label, knowledge }
}

export function canonicalPartLabel(token: string) {
  const aliases = { ...EXTRA_ALIASES, ...livePartAliases() }
  return aliases[fold(token)] || token
}
