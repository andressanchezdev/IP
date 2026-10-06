import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRelaxedAttempts,
  correctQueryTokens,
  editDistance,
  phoneticKey,
  resolveVocabToken,
  splitStuckToken,
} from '../src/features/catalog/lib/searchFuzzy.js'

function makeLexicon() {
  const words = new Set()
  const roles = new Map()
  const add = (token, role) => {
    words.add(token)
    const current = roles.get(token) || new Set()
    current.add(role)
    roles.set(token, current)
  }
  ;['amortiguador', 'espejos', 'bateria', 'llanta', 'pastilla'].forEach((token) => add(token, 'categoria'))
  ;['libero', 'honda', 'yamaha'].forEach((token) => add(token, 'marca'))
  ;['libero', 'boxer', 'pulsar', 'nmax'].forEach((token) => add(token, 'modelo'))
  return { words, roles, fixes: { yanta: 'llanta' } }
}

test('editDistance cuenta una transposición como un solo error', () => {
  assert.equal(editDistance('libreo', 'libero'), 1)
  assert.equal(editDistance('mortiguador', 'amortiguador'), 1)
  assert.equal(editDistance('abc', 'abc'), 0)
})

test('phoneticKey iguala escrituras con la misma pronunciación', () => {
  assert.equal(phoneticKey('vateria'), phoneticKey('bateria'))
  assert.equal(phoneticKey('yanta'), phoneticKey('llanta'))
})

test('"mortiguador liberi" se entiende como "amortiguador libero"', () => {
  const corrected = correctQueryTokens(['mortiguador', 'liberi'], makeLexicon())
  assert.deepEqual(corrected, ['amortiguador', 'libero'])
})

test('corrige transposiciones y pronunciación', () => {
  const lexicon = makeLexicon()
  assert.equal(resolveVocabToken('libreo', lexicon), 'libero')
  assert.equal(resolveVocabToken('vateria', lexicon), 'bateria')
})

test('no toca códigos, medidas ni singular/plural válido', () => {
  const lexicon = makeLexicon()
  assert.equal(resolveVocabToken('215', lexicon), '215')
  assert.equal(resolveVocabToken('cb190r', lexicon), 'cb190r')
  assert.equal(resolveVocabToken('espejo', lexicon), 'espejo')
})

test('separa palabras pegadas', () => {
  const lexicon = makeLexicon()
  assert.deepEqual(splitStuckToken('espejoslibero', lexicon), ['espejos', 'libero'])
  assert.deepEqual(splitStuckToken('libero215', lexicon), ['libero', '215'])
})

test('"espejos LIBERO 215" prueba primero todo y luego solo lo reconocido', () => {
  const lexicon = makeLexicon()
  const cleaned = correctQueryTokens(['espejos', 'libero', '215'], lexicon).join(' ')
  const attempts = buildRelaxedAttempts({ primary: cleaned, cleaned, lexicon })
  assert.deepEqual(attempts, ['espejos libero 215', 'espejos libero', 'libero'])
})

test('sin ruido solo queda el texto completo y el intento solo marca/modelo', () => {
  const lexicon = makeLexicon()
  const attempts = buildRelaxedAttempts({
    primary: 'amortiguador libero',
    cleaned: 'amortiguador libero',
    lexicon,
  })
  assert.deepEqual(attempts, ['amortiguador libero', 'libero'])
})
