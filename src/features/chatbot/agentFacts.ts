/**
 * Hechos de empresa curados (estilo knowledge de HINATA, sin LLM).
 * Fuente: bot settings / contacto live. Solo dominio Importadora Premium.
 */

import { getBotSettings, liveContact } from './botSettings'

export type CompanyFactKey =
  | 'contacto'
  | 'horario'
  | 'ubicacion'
  | 'envio'
  | 'pago'
  | 'credito'
  | 'empresa'
  | 'alcance'

export function companyFact(key: CompanyFactKey): string {
  const contact = liveContact()
  const settings = getBotSettings()
  const phone = contact.phoneDisplay || 'el WhatsApp publicado'
  const email = contact.email || 'el correo publicado'
  const address = [contact.addressLabel, contact.address, contact.city].filter(Boolean).join(', ')
    || 'nuestras sedes publicadas'
  const hours = contact.hoursDisplay || contact.hoursWeekdays || 'el horario publicado en la página'
  const shippingText = settings.replies?.shipping?.text

  switch (key) {
    case 'contacto':
      return `WhatsApp ${phone}. Correo ${email}.`
    case 'horario':
      return `Horario de atención: ${hours}.`
    case 'ubicacion':
      return `Nos ubicas en: ${address}.`
    case 'envio':
      return shippingText
        ? String(shippingText)
        : 'Hacemos envíos según ciudad y valor del pedido. Si me dices tu ciudad, te oriento.'
    case 'pago':
      return String(
        settings.replies?.payment?.text
        || 'Medios de pago: efectivo, transferencia y crédito (si tu cuenta lo tiene habilitado).',
      )
    case 'credito':
      return String(
        settings.replies?.credit?.text
        || 'El crédito aplica según trayectoria y cupo del cliente. Si no lo ves en Finalizar, consulta con un asesor.',
      )
    case 'empresa':
      return 'Somos Importadora Premium: repuestos y productos para moto. Catálogo, carrito y pedidos en esta misma app.'
    case 'alcance':
      return 'Atiendo solo consultas de la empresa, contacto, productos del catálogo y cómo comprar. Fuera de eso te paso con un asesor.'
    default:
      return ''
  }
}

/** Límites de dominio del agente (persona / SOUL liviano). */
export const AGENT_DOMAIN_RULES = [
  'Solo empresa, contacto, productos del catálogo y compra.',
  'Nunca inventar precio, stock ni referencias: usar catálogo API.',
  'Si no hay dato: decirlo y ofrecer WhatsApp asesor.',
] as const
