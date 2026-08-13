import { useProfile } from '@/app/providers'
import { formatOrderDateTime } from '@/features/orders/utils/orderFormat'

function text(value) {
  if (value == null) {
    return ''
  }
  return String(value).trim()
}

function PanelRow({ label, value, highlight = false, subdued = false }) {
  return (
    <div className="content-list-data__row">
      <span className="content-list-data__label">{label}</span>
      <span
        className={`content-list-data__value ${highlight ? 'content-list-data__value--highlight' : ''} ${subdued ? 'content-list-data__value--subdued' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * Dirección de entrega: prioriza datos del pedido y completa
 * correo/teléfono desde el perfil del login (user.email + usuario.telefono).
 */
export function OrderDeliveryContent({ order }) {
  const { profile, profileSettings } = useProfile()
  const personal = profileSettings?.personal ?? {}
  const delivery = order?.delivery ?? {}
  const client = order?.client ?? {}

  // Login: data.user.email + data.user.usuario.telefono/celular
  const loginEmail = text(personal.email)
    || text(profileSettings?.access?.email)
    || text(profile?.email)
  const loginPhone = text(personal.phone)
    || text(personal.mobile)
    || text(profile?.phone)
    || text(profile?.mobile)
  const loginName = text(personal.fullName) || text(profile?.fullName)
  const loginAddress = [
    personal.address,
    personal.neighborhood,
    personal.city,
    personal.department,
    personal.country,
  ].map(text).filter(Boolean).join(', ')

  const fullName = text(client.fullName) || loginName || '—'
  const email = text(client.email) || loginEmail || '—'
  const phone = text(client.phone) || text(client.mobile) || loginPhone || '—'
  const address = text(delivery.address) || text(client.address) || loginAddress || '—'
  const notes = text(delivery.notes) || '—'
  const receivedBy = text(delivery.receivedBy) || fullName

  return (
    <>
      <PanelRow label="Cliente" value={fullName} highlight />
      <PanelRow label="Correo" value={email} subdued />
      <PanelRow label="Teléfono" value={phone} subdued />
      <PanelRow label="Fecha de entrega" value={formatOrderDateTime(delivery.date)} highlight />
      <PanelRow label="Dirección" value={address} highlight />
      <PanelRow label="Datos de entrega" value={notes} subdued />
      <PanelRow label="Quien entrega" value={text(delivery.deliveredBy) || '—'} />
      <PanelRow label="Quien recibe" value={receivedBy} subdued />
    </>
  )
}
