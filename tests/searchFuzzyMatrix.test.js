import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRelaxedAttempts, correctQueryTokens } from '../src/features/catalog/lib/searchFuzzy.js'

const lexicon = { words: new Set(), roles: new Map(), fixes: { yanta: 'llanta', liberoo: 'libero', amortiguadore: 'amortiguador' } }

function add(list, role) {
  list.forEach((word) => {
    lexicon.words.add(word)
    const roles = lexicon.roles.get(word) || new Set()
    roles.add(role)
    lexicon.roles.set(word, roles)
  })
}

add(['amortiguador', 'amortiguadores', 'llanta', 'llantas', 'bateria', 'baterias', 'bujia', 'bujias', 'pastilla', 'pastillas', 'aceite', 'aceites', 'filtro', 'filtros', 'cadena', 'cadenas', 'disco', 'discos', 'casco', 'cascos'], 'pieza')
add(['amortiguadores', 'espejos', 'aceites', 'llantas', 'pastillas', 'freno', 'bujias', 'cadenas', 'baterias', 'filtros', 'kit', 'arrastre', 'manubrio', 'carburador'], 'categoria')
add(['libero', 'honda', 'yamaha', 'bajaj', 'akt', 'suzuki', 'kixx', 'motul', 'kawasaki', 'victory', 'hero', 'kymco'], 'marca')
add(['libero', 'boxer', 'pulsar', 'nmax', 'discover', 'gixxer', '215', '150', '125'], 'modelo')

const fix = (text) => correctQueryTokens(text.split(' '), lexicon).join(' ')

const MATRIX = [
  // letra faltante, de más, cambiada, transpuesta, en la marca y en la pieza
  ['mortiguador liberi', 'amortiguador libero'],
  ['amortiguadr libero', 'amortiguador libero'],
  ['amortigudaor libero', 'amortiguador libero'],
  ['amortiguador libreo', 'amortiguador libero'],
  ['amortigador libero', 'amortiguador libero'],
  ['amortiguadir libero', 'amortiguador libero'],
  ['amortiguad libero', 'amortiguador libero'],
  // palabra cortada con espacio, pegada, pegada con error
  ['amorti guador libero', 'amortiguador libero'],
  ['amortiguadorlibero', 'amortiguador libero'],
  ['amortiguadorlibreo', 'amortiguador libero'],
  // relleno y letras sueltas
  ['amortiguador d libero', 'amortiguador libero'],
  ['necesito amortiguador libero', 'amortiguador libero'],
  // espejos libero 215 y variaciones
  ['espjos libero 215', 'espejos libero 215'],
  ['spejos libero 215', 'espejos libero 215'],
  ['espeejos libero 215', 'espejos libero 215'],
  ['ezpejos libero 215', 'espejos libero 215'],
  ['espehos libero 215', 'espejos libero 215'],
  ['espejoslibero215', 'espejos libero 215'],
  ['espejos libero215', 'espejos libero 215'],
  ['espejos 215libero', 'espejos 215 libero'],
  // fonética, marcas y modelos cortos
  ['vateria yamaha', 'bateria yamaha'],
  ['buhia honda', 'bujia honda'],
  ['pastiya honda', 'pastilla honda'],
  ['yamha pulzar', 'yamaha pulsar'],
  ['quix aceite', 'kixx aceite'],
  ['kixs aceite', 'kixx aceite'],
  ['hoda boxer', 'honda boxer'],
  ['boxr honda', 'boxer honda'],
  // no se debe tocar
  ['espejo libero 215', 'espejo libero 215'],
  ['cb190r honda', 'cb190r honda'],
  ['libero 215 espejos', 'libero 215 espejos'],
  ['kit arrastre', 'kit arrastre'],
]

for (const [input, expected] of MATRIX) {
  test(`corrige "${input}"`, () => {
    assert.equal(fix(input), expected)
  })
}

test('espejos libero 215: si 215 no existe se relaja hasta marca/modelo', () => {
  const noModel215 = {
    ...lexicon,
    words: new Set([...lexicon.words].filter((word) => word !== '215')),
    roles: new Map([...lexicon.roles].filter(([word]) => word !== '215')),
  }
  const attempts = buildRelaxedAttempts({
    primary: 'espejos libero 215',
    cleaned: 'espejos libero 215',
    lexicon: noModel215,
  })
  assert.deepEqual(attempts, ['espejos libero 215', 'espejos libero', 'libero'])
})
