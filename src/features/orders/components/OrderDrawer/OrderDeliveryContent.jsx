import { useProfile } from '@/app/providers'

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
 * Dirección de entrega: solo datos del pedido + perfil API (/users/about).
 * Sin fecha de entrega / quien entrega / quien recibe (no vienen de la API).
 */
export function OrderDeliveryContent({ order }) {
  const { profile, profileSettings } = useProfile()
  const personal = profileSettings?.personal ?? {}
  const delivery = order?.delivery ?? {}
  const client = order?.client ?? {}

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

  return (
    <>
      <PanelRow label="Cliente" value={fullName} highlight />
      <PanelRow label="Correo" value={email} subdued />
      <PanelRow label="Teléfono" value={phone} subdued />
      <PanelRow label="Dirección" value={address} highlight />
    </>
  )
}
