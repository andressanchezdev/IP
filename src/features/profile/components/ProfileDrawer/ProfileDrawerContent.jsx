import { useState } from 'react'
import { useProfile } from '@/app/providers'
import { formatPrice } from '@/shared/lib/formatPrice'
import { ProfileIdentityCard } from '@/features/profile/components/ProfileIdentityCard/ProfileIdentityCard'
import {
  DrawerCheckRow,
  DrawerPanel,
  DrawerSectionBody,
  DrawerSectionList,
  DrawerShell,
} from '@/shared/ui/DrawerShell/DrawerShell'
import listIcon from '@/assets/icons/list.svg'
import receiptIcon from '@/assets/icons/receipt.svg'
import creditCardIcon from '@/assets/icons/credit-card.svg'
import percentIcon from '@/assets/icons/percent.svg'
import shoppingBagIcon from '@/assets/icons/shopping-bag.svg'
import walletIcon from '@/assets/icons/wallet.svg'
import mapPinIcon from '@/assets/icons/map-pin.svg'
import cloudUploadIcon from '@/assets/icons/cloud-upload.svg'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import './ProfileDrawer.css'
import '@/features/profile/components/ProfilePriceList/ProfilePriceList.css'

const PROFILE_SECTIONS = [
  { id: 'price-list', label: 'Listado de precios', icon: listIcon },
  { id: 'debts', label: 'Adeudos', icon: receiptIcon },
  { id: 'credit', label: 'Crédito', icon: creditCardIcon },
  { id: 'discounts', label: 'Descuentos', icon: percentIcon },
  { id: 'purchases', label: 'Compras', icon: shoppingBagIcon },
  { id: 'balance', label: 'Saldo a favor', icon: walletIcon },
  { id: 'addresses', label: 'Direcciones de entrega', icon: mapPinIcon },
  { id: 'bulk-upload', label: 'Subida masiva', icon: cloudUploadIcon },
]

const PRICE_LIST_ACTIONS = [
  { id: 'download', label: 'Método de descarga' },
  { id: 'brand', label: 'Marca a escoger' },
  { id: 'category', label: 'Categoría a escoger' },
  { id: 'model', label: 'Modelo a escoger' },
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

export function ProfileDrawerContent({ onOpenBulkUpload, onOpenPriceListView }) {
  const { profile, profileSettings } = useProfile()
  const [openSectionId, setOpenSectionId] = useState(null)

  const toggleSection = (sectionId) => {
    if (sectionId === 'bulk-upload') {
      onOpenBulkUpload?.()
      return
    }

    setOpenSectionId((current) => (current === sectionId ? null : sectionId))
  }

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'price-list':
        return (
          <div className="profile-price-list__actions">
            {PRICE_LIST_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className="content-list-data__row content-list-data__row--action"
                onClick={() => onOpenPriceListView?.(action.id)}
                {...namedControl(action.label)}
              >
                <span className="content-list-data__label">{action.label}</span>
                <span className="content-list-data__value content-list-data__value--highlight" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
          </div>
        )
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
    <DrawerShell>
      <DrawerPanel>
        <ProfileIdentityCard
          personal={profileSettings.personal}
          avatar={profile.avatar}
        />
      </DrawerPanel>

      <DrawerPanel title="Información de Usuario" variant="quick">
        <DrawerSectionList>
          {PROFILE_SECTIONS.map((section) => {
            const isOpen = openSectionId === section.id
            return (
              <div key={section.id} className="profile-drawer-section">
                <DrawerCheckRow
                  active={isOpen}
                  onClick={() => toggleSection(section.id)}
                  label={section.label}
                >
                  <span className="profile-drawer-section__label">
                    <img
                      src={section.icon}
                      className="profile-drawer-section__icon"
                      {...namedImage(section.label)}
                    />
                    {section.label}
                  </span>
                  <span
                    className={`filter-drawer-check__caret${isOpen && section.id !== 'bulk-upload' ? ' filter-drawer-check__caret--open' : ''}`}
                    aria-hidden="true"
                  />
                </DrawerCheckRow>
                {isOpen && section.id !== 'bulk-upload' ? (
                  <DrawerSectionBody>
                    {renderSectionContent(section.id)}
                  </DrawerSectionBody>
                ) : null}
              </div>
            )
          })}
        </DrawerSectionList>
      </DrawerPanel>
    </DrawerShell>
  )
}
