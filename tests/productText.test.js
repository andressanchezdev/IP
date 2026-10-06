import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProductDetailSegments,
  buildProductDetailParts,
  buildProductDetailText,
  cleanProductField,
  readProductParts,
} from '../src/shared/lib/productText.js'
import { toUpperText, upperStringFields } from '../src/shared/lib/upperText.js'

test('orden fijo: descripcion, categoria, marca, modelo', () => {
  const text = buildProductDetailText({
    description: 'Amortiguador trasero',
    category: 'Suspension',
    brand: 'Libero',
    model: 'Boxer 150',
  })
  assert.equal(text, 'Amortiguador trasero · Suspension · Libero · Boxer 150')
})

test('sin descripcion usa categoria, marca y modelo', () => {
  const text = buildProductDetailText({
    description: '',
    category: 'ESPEJOS',
    brand: 'LIBERO',
    model: '215',
  })
  assert.equal(text, 'ESPEJOS · LIBERO · 215')
})

test('acepta alias del API en español', () => {
  const text = buildProductDetailText({
    descripcion: '',
    categoria: 'ACEITE',
    marca: 'MOTUL',
    modelo: '20W50',
  })
  assert.equal(text, 'ACEITE · MOTUL · 20W50')
})

test('placeholders no cuentan como dato', () => {
  for (const value of ['—', '-', '–', 'N/A', 'null', 'undefined', 'Sin descripción', 'Producto #123', '  ']) {
    assert.equal(cleanProductField(value), '', `"${value}" debe quedar vacío`)
  }
  const text = buildProductDetailText({
    description: 'Producto #123',
    category: 'FRENOS',
    brand: '—',
    model: 'CB190R',
  })
  assert.equal(text, 'FRENOS · CB190R')
})

test('no repite lo que la descripcion ya contiene', () => {
  const parts = buildProductDetailParts({
    description: 'ACEITE MOTUL 20W50',
    category: 'Aceite',
    brand: 'Motul',
    model: '20W50',
  })
  assert.deepEqual(parts, ['ACEITE MOTUL 20W50'])
})

test('segmentos conservan la clave para poder acortar solo la descripcion', () => {
  const segments = buildProductDetailSegments({
    description: 'Kit de arrastre reforzado',
    category: 'Arrastre',
    brand: 'Bajaj',
    model: 'Boxer',
  })
  assert.deepEqual(segments.map((segment) => segment.key), ['description', 'brand', 'model'])
  assert.equal(segments[0].value, 'Kit de arrastre reforzado')
})

test('omit excluye partes (marca en columna propia)', () => {
  const text = buildProductDetailText(
    { description: 'Pastillas', category: 'Frenos', brand: 'Bajaj', model: 'Pulsar' },
    { omit: ['brand'] },
  )
  assert.equal(text, 'Pastillas · Frenos · Pulsar')
})

test('todo vacio devuelve Producto con codigo si existe', () => {
  assert.equal(buildProductDetailText({}), 'Producto')
  assert.equal(buildProductDetailText({ reference: '7701' }), 'Producto 7701')
  assert.equal(buildProductDetailText({ codigo: 'AB-1' }), 'Producto AB-1')
})

test('upper convierte el texto completo con eñe', () => {
  const text = buildProductDetailText({ description: 'Caña de dirección', brand: 'Yamaha' }, { upper: true })
  assert.equal(text, 'CAÑA DE DIRECCIÓN · YAMAHA')
})

test('readProductParts toma el primer alias con dato', () => {
  const parts = readProductParts({ description: '—', descripcion: 'Casco', category: '', categoria: 'Cascos' })
  assert.equal(parts.description, 'Casco')
  assert.equal(parts.category, 'Cascos')
})

test('upperStringFields solo cambia strings de la lista y conserva claves/numeros', () => {
  const body = {
    id_producto: 2,
    cantidad: 1,
    precio_unitario: 28000,
    aplicacion: 'json',
    fecha: '2026-09-25 10:15:00',
  }
  const next = upperStringFields(body, ['aplicacion'])
  assert.deepEqual(Object.keys(next), Object.keys(body))
  assert.equal(next.aplicacion, 'JSON')
  assert.equal(next.fecha, '2026-09-25 10:15:00')
  assert.equal(next.id_producto, 2)
  assert.equal(body.aplicacion, 'json')
})

test('toUpperText recorta y respeta ñ', () => {
  assert.equal(toUpperText('  año nuevo '), 'AÑO NUEVO')
  assert.equal(toUpperText(null), '')
})
