/**
 * Formatea reverse-geocode (Nominatim) al mismo estilo de direcciones registradas:
 * "calle, barrio, ciudad, departamento, pais"
 */

import { formatAddressDisplay } from '@/features/auth/utils/mapAboutAddresses'

function text(value) {
  return String(value ?? '').trim()
}

function pickFirst(...values) {
  for (const value of values) {
    const next = text(value)
    if (next) {
      return next
    }
  }
  return ''
}

function buildStreetLine(addressParts = {}) {
  const road = pickFirst(
    addressParts.road,
    addressParts.pedestrian,
    addressParts.path,
    addressParts.street,
  )
  const house = pickFirst(addressParts.house_number, addressParts.housenumber)
  if (road && house) {
    return `${road} #${house}`
  }
  return road || house
}

/**
 * @param {object} nominatimPayload - respuesta jsonv2 de Nominatim
 * @param {{ lat?: number, lng?: number }} coords
 * @returns {string}
 */
export function formatNominatimAddress(nominatimPayload, coords = {}) {
  const parts = nominatimPayload?.address && typeof nominatimPayload.address === 'object'
    ? nominatimPayload.address
    : {}

  const entry = {
    address: buildStreetLine(parts),
    neighborhood: pickFirst(
      parts.neighbourhood,
      parts.neighborhood,
      parts.suburb,
      parts.quarter,
      parts.residential,
    ),
    city: pickFirst(
      parts.city,
      parts.town,
      parts.municipality,
      parts.village,
      parts.city_district,
    ),
    department: pickFirst(parts.state, parts.region, parts.province),
    country: pickFirst(parts.country),
  }

  const formatted = formatAddressDisplay(entry)
  if (formatted) {
    return formatted
  }

  const lat = Number(coords.lat)
  const lng = Number(coords.lng)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }

  return ''
}
