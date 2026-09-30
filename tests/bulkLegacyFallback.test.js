import test from 'node:test'
import assert from 'node:assert/strict'

import { buildLegacyBulkComparison, STOCK_STATUS } from '../src/features/profile/api/bulkOrderApi.js'

test('legacy bulk comparison allows processing when check-massive is unavailable', () => {
  const resolvedByCode = new Map([
    ['ABC-001', { id: 10, precio: 1000, compra: 800, iva: 19, exento: 0, aplicacion: 'json' }],
    ['ABC-002', { id: 11, precio: 2000, compra: 1500, iva: 19, exento: 0, aplicacion: 'json' }],
  ])

  const comparison = buildLegacyBulkComparison([
    { codigo: 'ABC-001', cantidad: 3 },
    { codigo: 'ABC-002', cantidad: 5 },
  ], resolvedByCode)

  assert.equal(comparison.summary.ok, 2)
  assert.equal(comparison.summary.agotado, 0)
  assert.equal(comparison.results[0].estado, STOCK_STATUS.OK)
  assert.equal(comparison.results[0].stock, 3)
  assert.equal(comparison.results[0].id, '10')
  assert.equal(Number(comparison.checkRequest.productos[0].id_producto), 10)
})
