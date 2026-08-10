import { useState } from 'react'
import { useProfile } from '@/app/providers'
import { formatPrice } from '@/shared/lib/formatPrice'
import { DrawerAccordionSection } from '@/shared/ui/Drawer/DrawerAccordionSection'
import { ProfileIdentityCard } from '@/features/profile/components/ProfileIdentityCard/ProfileIdentityCard'
import '@/features/orders/components/OrderDrawer/OrderDrawer.css'
import './ProfileDrawer.css'

const PROFILE_SECTIONS = [
  { id: 'price-list', label: 'Listado de precios' },
  { id: 'debts', label: 'Adeudos' },
  { id: 'credit', label: 'Crédito' },
  { id: 'discounts', label: 'Descuentos' },
  { id: 'purchases', label: 'Compras' },
  { id: 'balance', label: 'Saldo a favor' },
  { id: 'addresses', label: 'Direcciones de entrega' },
]

function ProfilePanelRow({ label, value, highlight = false }) {
  return (
    <div className="content-list-data__row">
      <span className="content-list-data__label">{label}</span>
      <span className={`content-list-data__value ${highlight ? 'content-list-data__value--highlight' : ''}`}>
        {value}
      </span>
    </div>
  )
}

export function ProfileDrawerContent() {
  const { profile, profileSettings } = useProfile()
  const [openSections, setOpenSections] = useState([])

  const toggleSection = (sectionId) => {
    setOpenSections((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    )
  }

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'price-list':
        if (!profile.priceList?.length) {
          return <ProfilePanelRow label="Listas" value="Sin datos" />
        }
        return profile.priceList.map((entry) => (
          <ProfilePanelRow
            key={entry.label}
            label={entry.label}
            value={`${entry.items} productos`}
          />
        ))
      case 'debts':
        return <ProfilePanelRow label="Total adeudado" value={formatPrice(profile.adeudos)} highlight />
      case 'credit':
        return <ProfilePanelRow label="Cupo disponible" value={formatPrice(profile.credito)} highlight />
      case 'discounts':
        return <ProfilePanelRow label="Descuentos activos" value={formatPrice(profile.descuentos)} highlight />
      case 'purchases':
        return <ProfilePanelRow label="Compras realizadas" value={String(profile.compras ?? 0)} highlight />
      case 'balance':
        return <ProfilePanelRow label="Saldo disponible" value={formatPrice(profile.saldoFavor)} highlight />
      case 'addresses':
        if (!profile.addresses?.length) {
          return <ProfilePanelRow label="Direcciones" value="Sin direcciones registradas" />
        }
        return profile.addresses.map((entry) => (
          <div key={entry.id} className="profile-address">
            <strong className="profile-address__label">{entry.label}</strong>
            <span className="profile-address__value">{entry.address}</span>
          </div>
        ))
      default:
        return null
    }
  }

  return (
    <div className="order-drawer-shell profile-drawer-shell">
      <ProfileIdentityCard
        personal={profileSettings.personal}
        avatar={profile.avatar}
      />

      <div className="order-accordion content-list-data profile-accordion">
        {PROFILE_SECTIONS.map((section) => (
          <DrawerAccordionSection
            key={section.id}
            id={section.id}
            title={section.label}
            isOpen={openSections.includes(section.id)}
            onToggle={toggleSection}
          >
            {renderSectionContent(section.id)}
          </DrawerAccordionSection>
        ))}
      </div>
    </div>
  )
}
