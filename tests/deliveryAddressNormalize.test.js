import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeDeliveryAddressForApi } from '../src/features/orders/utils/normalizeDeliveryAddress.js'
import { mapSaleToHistoryOrder } from '../src/features/orders/mappers/mapSalesHistory.js'

test('normaliza direcciones abreviadas para la creación del pedido', () => {
  const normalized = normalizeDeliveryAddressForApi('cr 81 #114-41')
  assert.match(normalized.toLowerCase(), /carrera 81 #114-41/)
})

test('mapea la dirección de la API al pedido para la vista de detalle', () => {
  const order = mapSaleToHistoryOrder({
    id_venta: 12,
    clave_venta: 'PED-12',
    estado: 'pendiente',
    metodo_pago: 'efectivo',
    total: 150000,
    fecha: '2026-09-30 10:00:00',
    direccion: 'carrera 51 #4022',
    barrio: 'Colón',
    ciudad: 'Medellín',
    departamento: 'Antioquia',
    pais: 'Colombia',
  })

  assert.equal(order.delivery.address, 'Carrera 51 #4022, Colón, Medellín, Antioquia, Colombia')
})
