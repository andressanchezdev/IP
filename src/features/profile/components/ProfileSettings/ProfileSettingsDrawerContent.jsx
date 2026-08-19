import { useEffect, useState } from 'react'
import { useAuth, useProfile, useUi } from '@/app/providers'
import { useToast } from '@/app/providers/ToastProvider'
import { changeUserPassword } from '@/features/profile/api/profileApi'
import { defaultProfileSettings } from '@/features/profile/data/profileDefaults'
import { ProfileIdentityCard } from '@/features/profile/components/ProfileIdentityCard/ProfileIdentityCard'
import { confirmAction } from '@/shared/lib/confirmAction'
import {
  DrawerCheckRow,
  DrawerPanel,
  DrawerSectionBody,
  DrawerSectionList,
  DrawerShell,
} from '@/shared/ui/DrawerShell/DrawerShell'
import userIcon from '@/assets/icons/user.svg'
import buildingIcon from '@/assets/icons/building.svg'
import bellIcon from '@/assets/icons/bell.svg'
import databaseIcon from '@/assets/icons/database.svg'
import keyIcon from '@/assets/icons/key.svg'
import fileTextIcon from '@/assets/icons/file-text.svg'
import deleteAccountIcon from '@/assets/icons/delete-account.svg'
import mapPinIcon from '@/assets/icons/map-pin.svg'
import { PersonalDataForm } from './PersonalDataForm'
import { AccessForm, CompanyDataForm } from './CompanyAccessForms'
import { LegalLinksSection, NotificationsSection } from './SettingsStaticSections'
import { AddressModal } from './AddressModal'
import { ChangePasswordModal } from './ChangePasswordModal'
import { namedControl, namedImage } from '@/shared/lib/namedControl'
import '@/features/profile/components/ProfileDrawer/ProfileDrawer.css'
import './ProfileSettings.css'

const MAX_ADDRESSES = 3

const SETTINGS_SECTIONS = [
  { id: 'personal', label: 'Datos personales', icon: userIcon },
  { id: 'company', label: 'Datos de la empresa', icon: buildingIcon },
  { id: 'addresses', label: 'Direcciones', icon: mapPinIcon },
  { id: 'notifications', label: 'Notificaciones', icon: bellIcon },
  { id: 'cache', label: 'Borrar caché', icon: databaseIcon },
  { id: 'access', label: 'Acceso', icon: keyIcon },
  { id: 'terms', label: 'Documentos legales', icon: fileTextIcon },
  { id: 'delete', label: 'Eliminar cuenta', icon: deleteAccountIcon },
]

export function ProfileSettingsDrawerContent() {
  const {
    profile,
    profileSettings,
    saveProfilePersonal,
    saveProfileCompany,
    setNotificationsEnabled,
    addAddress,
    removeAddress,
    releaseAppCache,
    deleteAccount,
  } = useProfile()
  const { tokenAccess, logout } = useAuth()
  const { closeDrawer } = useUi()
  const { showToast } = useToast()
  const [openSectionId, setOpenSectionId] = useState(null)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [personalDraft, setPersonalDraft] = useState(() => ({
    ...defaultProfileSettings.personal,
    ...profileSettings.personal,
  }))
  const [companyDraft, setCompanyDraft] = useState(profileSettings.company)
  const [accessDraft, setAccessDraft] = useState(profileSettings.access)

  useEffect(() => {
    setPersonalDraft({
      ...defaultProfileSettings.personal,
      ...profileSettings.personal,
    })
  }, [profileSettings.personal])

  useEffect(() => {
    setCompanyDraft(profileSettings.company)
  }, [profileSettings.company])

  useEffect(() => {
    setAccessDraft(profileSettings.access)
  }, [profileSettings.access])

  const toggleSection = (sectionId) => {
    setOpenSectionId((current) => (current === sectionId ? null : sectionId))
  }

  const confirmAndSave = async ({ title, text, confirmText, action, successMessage }) => {
    const confirmed = await confirmAction({ title, text, confirmText })
    if (!confirmed) {
      return
    }
    action()
    showToast(successMessage, 'success')
  }

  const handleSavePersonal = () => confirmAndSave({
    title: '¿Guardar datos personales?',
    text: 'Se actualizará la información de tu perfil.',
    confirmText: 'Guardar datos',
    action: () => saveProfilePersonal(personalDraft),
    successMessage: 'Datos personales guardados',
  })

  const handleSaveCompany = () => confirmAndSave({
    title: '¿Guardar datos de la empresa?',
    text: 'Se actualizará la información empresarial.',
    confirmText: 'Guardar datos',
    action: () => saveProfileCompany(companyDraft),
    successMessage: 'Datos de la empresa guardados',
  })

  const handleChangePassword = async ({ currentPassword, newPassword }) => {
    if (!tokenAccess) {
      throw new Error('Sesión requerida para actualizar la contraseña')
    }

    await changeUserPassword({
      token: tokenAccess,
      oldPassword: currentPassword,
      newPassword,
    })

    setChangePasswordOpen(false)
    closeDrawer()
    showToast('Contraseña actualizada. Inicia sesión de nuevo.', 'success')
    await logout()
  }

  const handleClearCache = async () => {
    const confirmed = await confirmAction({
      title: '¿Liberar caché?',
      text: 'Se eliminarán datos temporales de productos, carrito y pedidos.',
      confirmText: 'Liberar caché',
      icon: 'warning',
    })

    if (!confirmed) {
      return
    }

    releaseAppCache()
    showToast('Caché liberada', 'success')
  }

  const handleDeleteAccount = async () => {
    const confirmed = await confirmAction({
      title: '¿Eliminar cuenta?',
      text: 'Esta acción restablecerá tu información local. Debes confirmar para continuar.',
      icon: 'warning',
      confirmText: 'Eliminar cuenta',
      confirmButtonColor: '#c62828',
    })

    if (!confirmed) {
      return
    }

    deleteAccount()
    closeDrawer()
    showToast('Cuenta eliminada', 'success')
  }

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'personal':
        return (
          <PersonalDataForm
            draft={personalDraft}
            onDraftChange={setPersonalDraft}
            onSave={handleSavePersonal}
          />
        )
      case 'company':
        return (
          <CompanyDataForm
            draft={companyDraft}
            onDraftChange={setCompanyDraft}
            onSave={handleSaveCompany}
          />
        )
      case 'addresses': {
        const addresses = profileSettings.addresses ?? []
        const canAdd = addresses.length < MAX_ADDRESSES
        return (
          <div className="profile-addresses">
            {addresses.length === 0 && (
              <p className="profile-addresses__empty">No hay direcciones registradas</p>
            )}
            {addresses.map((addr, index) => (
              <div key={addr.label + index} className="profile-addresses__card">
                <div className="profile-addresses__info">
                  <strong>{addr.label || `Dirección ${index + 1}`}</strong>
                  <span>{[addr.address, addr.neighborhood, addr.city, addr.department].filter(Boolean).join(', ')}</span>
                  {addr.notes && <span className="profile-addresses__notes">{addr.notes}</span>}
                </div>
                <button
                  type="button"
                  className="profile-addresses__remove"
                  onClick={async () => {
                    const confirmed = await confirmAction({
                      title: '¿Eliminar dirección?',
                      text: `Se eliminará "${addr.label || `Dirección ${index + 1}`}".`,
                      confirmText: 'Eliminar',
                      confirmButtonColor: '#c62828',
                    })
                    if (confirmed) {
                      removeAddress(index)
                      showToast('Dirección eliminada', 'success')
                    }
                  }}
                  {...namedControl('Eliminar dirección')}
                >
                  ×
                </button>
              </div>
            ))}
            {canAdd && (
              <button
                type="button"
                className="order-payment__add-btn profile-addresses__add"
                onClick={() => setAddressModalOpen(true)}
                {...namedControl('Agregar dirección')}
              >
                +
              </button>
            )}
            {!canAdd && (
              <p className="profile-addresses__limit">Máximo {MAX_ADDRESSES} direcciones</p>
            )}
          </div>
        )
      }
      case 'notifications':
        return (
          <NotificationsSection
            enabled={profileSettings.notificationsEnabled}
            onChange={(checked) => {
              setNotificationsEnabled(checked)
              showToast(
                checked ? 'Notificaciones activadas' : 'Notificaciones desactivadas',
                'success',
              )
            }}
          />
        )
      case 'cache':
        return (
          <button type="button" className="profile-settings-cache-btn" onClick={handleClearCache} {...namedControl('Presionar para liberar caché')}>
            Presionar para liberar caché
          </button>
        )
      case 'access':
        return (
          <AccessForm
            draft={accessDraft}
            onDraftChange={setAccessDraft}
            onUpdatePassword={() => setChangePasswordOpen(true)}
          />
        )
      case 'terms':
        return <LegalLinksSection />
      case 'delete':
        return (
          <button type="button" className="profile-settings-delete" onClick={handleDeleteAccount} {...namedControl('Eliminar cuenta')}>
            <img src={deleteAccountIcon} className="profile-settings-delete__icon" {...namedImage('Eliminar cuenta')} />
            Eliminar cuenta
          </button>
        )
      default:
        return null
    }
  }

  return (
    <>
      <DrawerShell>
        <DrawerPanel>
          <ProfileIdentityCard
            personal={profileSettings.personal}
            avatar={profile.avatar}
          />
        </DrawerPanel>

        <DrawerPanel title="Ajustes" variant="quick">
          <DrawerSectionList>
            {SETTINGS_SECTIONS.map((section) => {
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
                      className={`filter-drawer-check__caret${isOpen ? ' filter-drawer-check__caret--open' : ''}`}
                      aria-hidden="true"
                    />
                  </DrawerCheckRow>
                  {isOpen ? (
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

      <AddressModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSave={(address) => {
          addAddress(address)
          setAddressModalOpen(false)
          showToast('Dirección agregada', 'success')
        }}
      />

      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onConfirm={handleChangePassword}
      />
    </>
  )
}
